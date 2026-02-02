use crate::stt::providers::traits::STTProviderClient;
use crate::stt::types::{
    GoogleAuthMethod, GoogleAutoDecodingConfig, GoogleRecognitionConfig, GoogleRecognitionFeatures,
    GoogleRecognizeRequest, GoogleRecognizeResponse, ServiceAccountCredentials,
    STTProviderConfig,
};
use async_trait::async_trait;
use base64::Engine;
use serde::{Deserialize, Serialize};

pub struct GoogleCloudSTTClient {
    project_id: String,
    location: String,
    api_key: Option<String>,
    service_account_json: Option<String>,
    model: String,
    auth_method: GoogleAuthMethod,
}

impl GoogleCloudSTTClient {
    pub fn new(config: &STTProviderConfig) -> Self {
        Self {
            project_id: config.google_project_id.clone().unwrap_or_default(),
            location: "global".to_string(),
            api_key: if config.api_key.is_empty() {
                None
            } else {
                Some(config.api_key.clone())
            },
            service_account_json: config.google_service_account_json.clone(),
            model: if config.model.is_empty() {
                "chirp_3".to_string()
            } else {
                config.model.clone()
            },
            auth_method: config
                .google_auth_method
                .clone()
                .unwrap_or(GoogleAuthMethod::ApiKey),
        }
    }

    async fn get_access_token(&self) -> Result<String, String> {
        let sa_json = self
            .service_account_json
            .as_ref()
            .ok_or("Service account JSON not configured")?;

        let creds: ServiceAccountCredentials =
            serde_json::from_str(sa_json).map_err(|e| format!("Invalid service account JSON: {}", e))?;

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| format!("Time error: {}", e))?
            .as_secs();

        let claims = JwtClaims {
            iss: creds.client_email.clone(),
            scope: "https://www.googleapis.com/auth/cloud-platform".to_string(),
            aud: creds.token_uri.clone(),
            iat: now,
            exp: now + 3600,
        };

        let header = base64::engine::general_purpose::URL_SAFE_NO_PAD
            .encode(r#"{"alg":"RS256","typ":"JWT"}"#);
        let claims_json =
            serde_json::to_string(&claims).map_err(|e| format!("Failed to serialize claims: {}", e))?;
        let claims_b64 = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(&claims_json);

        let signing_input = format!("{}.{}", header, claims_b64);

        let private_key = creds
            .private_key
            .replace("\\n", "\n")
            .replace("\r\n", "\n");

        let signature = sign_rs256(&signing_input, &private_key)?;
        let signature_b64 = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(&signature);

        let jwt = format!("{}.{}", signing_input, signature_b64);

        let client = reqwest::Client::new();
        let response = client
            .post(&creds.token_uri)
            .form(&[
                ("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer"),
                ("assertion", &jwt),
            ])
            .send()
            .await
            .map_err(|e| format!("Failed to exchange JWT for token: {}", e))?;

        if !response.status().is_success() {
            let error_body = response.text().await.unwrap_or_default();
            return Err(format!("Token exchange failed: {}", error_body));
        }

        #[derive(Deserialize)]
        struct TokenResponse {
            access_token: String,
        }

        let token_response: TokenResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse token response: {}", e))?;

        Ok(token_response.access_token)
    }
}

#[derive(Serialize)]
struct JwtClaims {
    iss: String,
    scope: String,
    aud: String,
    iat: u64,
    exp: u64,
}

fn sign_rs256(data: &str, private_key_pem: &str) -> Result<Vec<u8>, String> {
    use sha2::{Digest, Sha256};

    let private_key_pem = private_key_pem.trim();
    
    let der_bytes = extract_der_from_pem(private_key_pem)?;
    let (n, d) = parse_rsa_private_key(&der_bytes)?;

    let mut hasher = Sha256::new();
    hasher.update(data.as_bytes());
    let hash = hasher.finalize();

    let digest_info: Vec<u8> = [
        &[0x30, 0x31, 0x30, 0x0d, 0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01, 0x05, 0x00, 0x04, 0x20][..],
        hash.as_slice(),
    ].concat();

    let k = n.len();
    if k < digest_info.len() + 11 {
        return Err("Key too small for PKCS#1 v1.5 padding".to_string());
    }

    let mut em = vec![0u8; k];
    em[0] = 0x00;
    em[1] = 0x01;
    let ps_len = k - digest_info.len() - 3;
    for i in 0..ps_len {
        em[2 + i] = 0xff;
    }
    em[2 + ps_len] = 0x00;
    em[3 + ps_len..].copy_from_slice(&digest_info);

    let signature = mod_exp(&em, &d, &n);

    let mut sig_bytes = signature;
    while sig_bytes.len() < k {
        sig_bytes.insert(0, 0);
    }

    Ok(sig_bytes)
}

fn extract_der_from_pem(pem: &str) -> Result<Vec<u8>, String> {
    let lines: Vec<&str> = pem.lines().collect();
    let mut base64_content = String::new();
    let mut in_key = false;

    for line in lines {
        if line.contains("BEGIN") && line.contains("PRIVATE KEY") {
            in_key = true;
            continue;
        }
        if line.contains("END") && line.contains("PRIVATE KEY") {
            break;
        }
        if in_key {
            base64_content.push_str(line.trim());
        }
    }

    base64::engine::general_purpose::STANDARD
        .decode(&base64_content)
        .map_err(|e| format!("Failed to decode PEM base64: {}", e))
}

fn parse_rsa_private_key(der: &[u8]) -> Result<(Vec<u8>, Vec<u8>), String> {
    let mut pos = 0;

    fn read_length(data: &[u8], pos: &mut usize) -> Result<usize, String> {
        if *pos >= data.len() {
            return Err("Unexpected end of data".to_string());
        }
        let first = data[*pos];
        *pos += 1;
        if first & 0x80 == 0 {
            Ok(first as usize)
        } else {
            let num_bytes = (first & 0x7f) as usize;
            if *pos + num_bytes > data.len() {
                return Err("Invalid length encoding".to_string());
            }
            let mut len = 0usize;
            for _ in 0..num_bytes {
                len = (len << 8) | (data[*pos] as usize);
                *pos += 1;
            }
            Ok(len)
        }
    }

    fn skip_tag_length(data: &[u8], pos: &mut usize, expected_tag: u8) -> Result<usize, String> {
        if *pos >= data.len() || data[*pos] != expected_tag {
            return Err(format!("Expected tag 0x{:02x}", expected_tag));
        }
        *pos += 1;
        read_length(data, pos)
    }

    fn read_integer(data: &[u8], pos: &mut usize) -> Result<Vec<u8>, String> {
        let len = skip_tag_length(data, pos, 0x02)?;
        if *pos + len > data.len() {
            return Err("Integer extends beyond data".to_string());
        }
        let mut bytes = data[*pos..*pos + len].to_vec();
        *pos += len;
        while bytes.len() > 1 && bytes[0] == 0 {
            bytes.remove(0);
        }
        Ok(bytes)
    }

    skip_tag_length(der, &mut pos, 0x30)?;

    let version = read_integer(der, &mut pos)?;
    if (version.len() != 1 || (version[0] != 0 && version[0] != 1)) && der[pos] == 0x30 {
        skip_tag_length(der, &mut pos, 0x30)?;
        skip_tag_length(der, &mut pos, 0x06)?;
        let oid_len = read_length(der, &mut pos.clone())?;
        pos += oid_len;
        if pos < der.len() && der[pos] == 0x05 {
            pos += 2;
        }
        skip_tag_length(der, &mut pos, 0x04)?;
        skip_tag_length(der, &mut pos, 0x30)?;
        let _ = read_integer(der, &mut pos)?;
    }

    let n = read_integer(der, &mut pos)?;
    let _ = read_integer(der, &mut pos)?;
    let d = read_integer(der, &mut pos)?;

    Ok((n, d))
}

fn mod_exp(base: &[u8], exp: &[u8], modulus: &[u8]) -> Vec<u8> {
    fn to_bigint(bytes: &[u8]) -> Vec<u32> {
        let mut result = Vec::new();
        let mut i = bytes.len();
        while i > 0 {
            let start = i.saturating_sub(4);
            let mut val = 0u32;
            for byte in bytes.iter().take(i).skip(start) {
                val = (val << 8) | (*byte as u32);
            }
            result.push(val);
            i = start;
        }
        while result.len() > 1 && result.last() == Some(&0) {
            result.pop();
        }
        if result.is_empty() {
            result.push(0);
        }
        result
    }

    fn from_bigint(n: &[u32]) -> Vec<u8> {
        let mut result = Vec::new();
        for &word in n.iter().rev() {
            result.push((word >> 24) as u8);
            result.push((word >> 16) as u8);
            result.push((word >> 8) as u8);
            result.push(word as u8);
        }
        while result.len() > 1 && result[0] == 0 {
            result.remove(0);
        }
        result
    }

    fn bigint_mul(a: &[u32], b: &[u32]) -> Vec<u32> {
        let mut result = vec![0u32; a.len() + b.len()];
        for (i, &ai) in a.iter().enumerate() {
            let mut carry = 0u64;
            for (j, &bj) in b.iter().enumerate() {
                let prod = (ai as u64) * (bj as u64) + (result[i + j] as u64) + carry;
                result[i + j] = prod as u32;
                carry = prod >> 32;
            }
            result[i + b.len()] = carry as u32;
        }
        while result.len() > 1 && result.last() == Some(&0) {
            result.pop();
        }
        result
    }

    fn bigint_cmp(a: &[u32], b: &[u32]) -> std::cmp::Ordering {
        use std::cmp::Ordering;
        if a.len() != b.len() {
            return a.len().cmp(&b.len());
        }
        for i in (0..a.len()).rev() {
            match a[i].cmp(&b[i]) {
                Ordering::Equal => continue,
                other => return other,
            }
        }
        Ordering::Equal
    }

    fn bigint_sub(a: &[u32], b: &[u32]) -> Vec<u32> {
        let mut result = a.to_vec();
        let mut borrow = 0i64;
        for i in 0..result.len() {
            let bi = if i < b.len() { b[i] as i64 } else { 0 };
            let diff = (result[i] as i64) - bi - borrow;
            if diff < 0 {
                result[i] = (diff + (1i64 << 32)) as u32;
                borrow = 1;
            } else {
                result[i] = diff as u32;
                borrow = 0;
            }
        }
        while result.len() > 1 && result.last() == Some(&0) {
            result.pop();
        }
        result
    }

    fn bigint_mod(a: &[u32], m: &[u32]) -> Vec<u32> {
        use std::cmp::Ordering;
        let mut r = a.to_vec();
        while bigint_cmp(&r, m) != Ordering::Less {
            let shift = if r.len() > m.len() {
                r.len() - m.len()
            } else {
                0
            };
            let mut shifted_m = vec![0u32; shift];
            shifted_m.extend_from_slice(m);
            if bigint_cmp(&r, &shifted_m) == Ordering::Less {
                shifted_m.remove(0);
            }
            if bigint_cmp(&r, &shifted_m) != Ordering::Less {
                r = bigint_sub(&r, &shifted_m);
            } else if shift > 0 {
                shifted_m.remove(0);
                if bigint_cmp(&r, &shifted_m) != Ordering::Less {
                    r = bigint_sub(&r, &shifted_m);
                }
            }
            if bigint_cmp(&r, m) != Ordering::Less && r == a.to_vec() {
                break;
            }
        }
        r
    }

    let base_int = to_bigint(base);
    let exp_int = to_bigint(exp);
    let mod_int = to_bigint(modulus);

    let mut result = vec![1u32];
    let mut base_pow = bigint_mod(&base_int, &mod_int);

    for &word in &exp_int {
        for bit in 0..32 {
            if (word >> bit) & 1 == 1 {
                result = bigint_mod(&bigint_mul(&result, &base_pow), &mod_int);
            }
            base_pow = bigint_mod(&bigint_mul(&base_pow, &base_pow), &mod_int);
        }
    }

    from_bigint(&result)
}

#[async_trait]
impl STTProviderClient for GoogleCloudSTTClient {
    async fn transcribe(
        &self,
        audio_data: Vec<u8>,
        language: Option<&str>,
    ) -> Result<String, String> {
        let client = reqwest::Client::new();

        let lang_code = language.unwrap_or("en-US").to_string();

        let url = match self.auth_method {
            GoogleAuthMethod::ApiKey => {
                let api_key = self
                    .api_key
                    .as_ref()
                    .ok_or("API key not configured")?;
                format!(
                    "https://speech.googleapis.com/v2/projects/{}/locations/{}/recognizers/_:recognize?key={}",
                    self.project_id, self.location, api_key
                )
            }
            GoogleAuthMethod::ServiceAccount => {
                format!(
                    "https://speech.googleapis.com/v2/projects/{}/locations/{}/recognizers/_:recognize",
                    self.project_id, self.location
                )
            }
        };

        let audio_base64 = base64::engine::general_purpose::STANDARD.encode(&audio_data);

        let request_body = GoogleRecognizeRequest {
            config: GoogleRecognitionConfig {
                auto_decoding_config: GoogleAutoDecodingConfig {},
                language_codes: vec![lang_code],
                model: self.model.clone(),
                features: Some(GoogleRecognitionFeatures {
                    enable_automatic_punctuation: true,
                }),
            },
            content: audio_base64,
        };

        let mut request = client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&request_body);

        if matches!(self.auth_method, GoogleAuthMethod::ServiceAccount) {
            let access_token = self.get_access_token().await?;
            request = request.header("Authorization", format!("Bearer {}", access_token));
        }

        let response = request
            .send()
            .await
            .map_err(|e| format!("Failed to connect to Google Cloud STT: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_body = response.text().await.unwrap_or_default();
            return Err(format!(
                "Google Cloud STT API error ({}): {}",
                status, error_body
            ));
        }

        let recognize_response: GoogleRecognizeResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse Google Cloud STT response: {}", e))?;

        let transcript = recognize_response
            .results
            .as_ref()
            .and_then(|results| {
                results
                    .iter()
                    .filter_map(|r| {
                        r.alternatives
                            .as_ref()
                            .and_then(|alts| alts.first())
                            .map(|a| a.transcript.clone())
                    })
                    .collect::<Vec<_>>()
                    .join(" ")
                    .into()
            })
            .unwrap_or_default();

        if transcript.is_empty() {
            return Err("No transcription from Google Cloud STT".to_string());
        }

        Ok(transcript.trim().to_string())
    }

    async fn list_models(&self) -> Result<Vec<String>, String> {
        Ok(vec![
            "chirp_3".to_string(),
            "chirp_2".to_string(),
            "long".to_string(),
            "short".to_string(),
        ])
    }

    async fn test_connection(&self) -> Result<bool, String> {
        match self.auth_method {
            GoogleAuthMethod::ApiKey => {
                if self.api_key.is_none() || self.api_key.as_ref().is_some_and(|k| k.is_empty()) {
                    return Err("API key not configured".to_string());
                }
                if self.project_id.is_empty() {
                    return Err("Project ID not configured".to_string());
                }
                Ok(true)
            }
            GoogleAuthMethod::ServiceAccount => {
                if self.project_id.is_empty() {
                    return Err("Project ID not configured".to_string());
                }
                self.get_access_token().await?;
                Ok(true)
            }
        }
    }

    fn provider_name(&self) -> &'static str {
        "Google Cloud STT"
    }
}
