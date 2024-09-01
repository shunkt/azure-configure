use anyhow::{Ok, Result};
use serde::{Deserialize, Serialize};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct Auth {
    pub access_token: String,
    #[serde(rename = "expires_on")]
    pub expires_on: u64,
    subscription: String,
    tenant: String,
    pub token_type: String,
}

impl Auth {
    pub fn get_access_token() -> Result<Self> {
        let output = if cfg!(target_os = "windows") {
            Command::new("cmd")
                .arg("/C")
                .args(["az", "account", "get-access-token", "--output", "json"])
                .output()?
        } else {
            Command::new("az")
                .args(["account", "get-access-token", "--output", "json"])
                .output()?
        };
        let output = String::from_utf8(output.stdout)?;

        let auth = serde_json::from_str::<Auth>(&output)?;
        Ok(auth)
    }

    pub fn get_valid_bearer(&mut self) -> Result<String> {
        let now = if let std::result::Result::Ok(n) = SystemTime::now().duration_since(UNIX_EPOCH) {
            n.as_secs()
        } else {
            std::u64::MAX
        };

        if self.expires_on < now {
            let auth = Self::get_access_token()?;
            self.access_token = auth.access_token;
            self.expires_on = auth.expires_on;
        };

        let bearer = format!("Bearer {}", self.access_token);
        Ok(bearer)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn get_access_token() {
        let result = Auth::get_access_token();
        assert!(result.is_ok(), "cannot get access token");
    }
}
