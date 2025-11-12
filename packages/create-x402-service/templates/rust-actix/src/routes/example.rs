use actix_web::{web, HttpRequest, HttpResponse, Result};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct ExampleRequest {
    pub data: serde_json::Value,
}

#[derive(Serialize)]
pub struct ExampleResponse {
    pub success: bool,
    pub message: String,
    pub data: serde_json::Value,
}

pub async fn handle_post(
    req: HttpRequest,
    body: web::Json<ExampleRequest>,
) -> Result<HttpResponse> {
    let payment_verified = req.extensions().get::<crate::x402::PaymentVerified>().is_some();

    let response = ExampleResponse {
        success: true,
        message: "Request processed successfully".to_string(),
        data: serde_json::json!({
            "input": body.data,
            "paymentVerified": payment_verified,
        }),
    };

    Ok(HttpResponse::Ok().json(response))
}

pub async fn handle_get(req: HttpRequest) -> Result<HttpResponse> {
    let payment_verified = req.extensions().get::<crate::x402::PaymentVerified>().is_some();

    let response = ExampleResponse {
        success: true,
        message: "GET request processed".to_string(),
        data: serde_json::json!({
            "paymentVerified": payment_verified,
        }),
    };

    Ok(HttpResponse::Ok().json(response))
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api")
            .route("/example", web::post().to(handle_post))
            .route("/example", web::get().to(handle_get)),
    );
}
