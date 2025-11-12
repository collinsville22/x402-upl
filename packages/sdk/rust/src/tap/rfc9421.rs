use ed25519_dalek::{Keypair, PublicKey, SecretKey, Signature, Signer};
use rand::rngs::OsRng;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone)]
pub enum SignatureAlgorithm {
    Ed25519,
    RsaPssSha256,
}

impl SignatureAlgorithm {
    pub fn as_str(&self) -> &str {
        match self {
            SignatureAlgorithm::Ed25519 => "ed25519",
            SignatureAlgorithm::RsaPssSha256 => "rsa-pss-sha256",
        }
    }
}

#[derive(Debug, Clone)]
pub struct SignatureParams {
    pub created: u64,
    pub expires: u64,
    pub key_id: String,
    pub alg: SignatureAlgorithm,
    pub nonce: String,
    pub tag: String,
}

#[derive(Debug, Clone)]
pub struct SignatureComponents {
    pub authority: String,
    pub path: String,
}

#[derive(Debug, Clone)]
pub struct SignatureResult {
    pub signature_input: String,
    pub signature: String,
}

pub struct RFC9421Signature;

impl RFC9421Signature {
    pub fn create_signature_base(
        components: &SignatureComponents,
        params: &SignatureParams,
    ) -> String {
        let mut lines = Vec::new();

        lines.push(format!(r#""@authority": {}"#, components.authority));
        lines.push(format!(r#""@path": {}"#, components.path));

        let signature_params_value = format!(
            r#"("@authority" "@path"); created={}; expires={}; keyid="{}"; alg="{}"; nonce="{}"; tag="{}""#,
            params.created,
            params.expires,
            params.key_id,
            params.alg.as_str(),
            params.nonce,
            params.tag
        );

        lines.push(format!(r#""@signature-params": {}"#, signature_params_value));

        lines.join("\n")
    }

    pub fn sign_ed25519(
        components: &SignatureComponents,
        params: &SignatureParams,
        keypair: &Keypair,
    ) -> SignatureResult {
        let signature_base = Self::create_signature_base(components, params);
        let message = signature_base.as_bytes();

        let signature: Signature = keypair.sign(message);
        let signature_b64 = base64::encode(signature.to_bytes());

        let signature_input = format!(
            r#"sig2=("@authority" "@path"); created={}; expires={}; keyid="{}"; alg="{}"; nonce="{}"; tag="{}""#,
            params.created,
            params.expires,
            params.key_id,
            params.alg.as_str(),
            params.nonce,
            params.tag
        );

        SignatureResult {
            signature_input,
            signature: format!("sig2=:{}:", signature_b64),
        }
    }

    pub fn generate_nonce() -> String {
        use rand::RngCore;
        let mut nonce = [0u8; 16];
        OsRng.fill_bytes(&mut nonce);
        hex::encode(nonce)
    }

    pub fn generate_ed25519_keypair() -> Keypair {
        Keypair::generate(&mut OsRng)
    }

    pub fn get_current_timestamp() -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs()
    }
}
