mod config;
mod routes;
mod x402;

use actix_cors::Cors;
use actix_web::{middleware::Logger, web, App, HttpResponse, HttpServer};
use config::Config;
use std::sync::Arc;
use tokio::sync::Mutex;
use x402::{RegistryClient, ServiceRegistration, Pricing};

async fn health_check(data: web::Data<AppState>) -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({
        "status": "healthy",
        "service": data.config.service_name.as_ref().unwrap_or(&"x402-actix-service".to_string()),
    }))
}

struct AppState {
    config: Arc<Config>,
    registry_client: Arc<Mutex<Option<RegistryClient>>>,
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init();

    let config = Config::from_env().expect("Failed to load configuration");
    let config = Arc::new(config);

    let registry_client = Arc::new(Mutex::new(None));

    if config.auto_register_service && config.service_url.is_some() && config.service_name.is_some() {
        let mut client = RegistryClient::new(config.registry_url.clone());

        let registration = ServiceRegistration {
            name: config.service_name.clone().unwrap(),
            description: config.service_description.clone().unwrap_or_default(),
            url: config.service_url.clone().unwrap(),
            category: config.service_category.clone().unwrap_or_else(|| "API".to_string()),
            pricing: Pricing {
                amount: config.service_price,
                currency: "CASH".to_string(),
            },
            wallet_address: config.treasury_wallet.clone(),
            network: config.network.clone(),
            accepted_tokens: config.accepted_tokens.clone(),
            capabilities: config.service_capabilities.clone(),
            tags: config.service_tags.clone(),
        };

        if let Err(e) = client.register_service(registration).await {
            log::error!("Failed to register service: {}", e);
        } else {
            let client_clone = Arc::clone(&registry_client);
            *client_clone.lock().await = Some(client);

            let registry_clone = Arc::clone(&registry_client);
            tokio::spawn(async move {
                let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(60));
                loop {
                    interval.tick().await;
                    let client_guard = registry_clone.lock().await;
                    if let Some(client) = client_guard.as_ref() {
                        if let Err(e) = client.heartbeat().await {
                            log::warn!("Heartbeat failed: {}", e);
                        }
                    }
                }
            });
        }
    }

    let app_state = web::Data::new(AppState {
        config: Arc::clone(&config),
        registry_client: Arc::clone(&registry_client),
    });

    let bind_addr = format!("{}:{}", config.host, config.port);
    log::info!("Service running on http://{}", bind_addr);

    let config_clone = Arc::clone(&config);
    let registry_clone = Arc::clone(&registry_client);

    let server = HttpServer::new(move || {
        App::new()
            .app_data(app_state.clone())
            .wrap(Logger::default())
            .wrap(Cors::permissive())
            .wrap_fn(x402::x402_middleware)
            .route("/health", web::get().to(health_check))
            .configure(routes::configure_example)
    })
    .bind(&bind_addr)?
    .run();

    let server_handle = server.handle();

    tokio::spawn(async move {
        tokio::signal::ctrl_c().await.ok();
        log::info!("Shutting down gracefully...");

        let client_guard = registry_clone.lock().await;
        if let Some(client) = client_guard.as_ref() {
            if let Err(e) = client.set_service_status("PAUSED").await {
                log::warn!("Failed to update service status: {}", e);
            } else {
                log::info!("Service status updated to PAUSED");
            }
        }

        server_handle.stop(true).await;
    });

    server.await
}
