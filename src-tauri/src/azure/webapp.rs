use crate::azure::share_structs::{Properties, ResponseBody};
use anyhow::{Ok, Result};
use log::trace;
use reqwest::{self};
use serde::{Deserialize, Serialize};
use serde_with::serde_as;
use std::collections::HashMap;
use std::{
    fs,
    io::{BufReader, BufWriter, Write},
    path::Path,
};
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppserviceEnvVar {
    pub name: String,
    pub value: String,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Webapp {
    pub subscription: Option<String>,
    pub name: String,
    pub resource_group: String,
}

impl Webapp {
    pub async fn list<'a>(token: &'a str, subscription: &'a str) -> Result<Vec<Self>> {
        let url = format!("https://management.azure.com/subscriptions/{subscriptionId}/providers/Microsoft.Web/sites?api-version=2023-12-01", subscriptionId=subscription);

        let client = reqwest::Client::new()
            .get(url)
            .header("Authorization", token);
        let body = client.send().await?.text().await?;
        trace!("response_body: {:#?}", body);
        let webapps = serde_json::from_str::<ResponseBody<Webapp>>(&body)?;
        trace!("parsed response: {:#?}", webapps);
        let webapps_with_subscription = webapps
            .value
            .into_iter()
            .map(|webapp| {
                let mut tmp = webapp;
                tmp.properties.subscription = Some(subscription.to_string());
                tmp.properties
            })
            .collect::<Vec<Webapp>>();
        trace!(
            "webapps_with_subscription: {:#?}",
            webapps_with_subscription
        );
        Ok(webapps_with_subscription)
    }

    pub async fn list_config<'a>(&self, token: &'a str) -> Result<Vec<AppserviceEnvVar>> {
        let url = format!(
            "https://management.azure.com/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Web/sites/{name}/config/appsettings/list?api-version=2023-12-01",
            subscriptionId= self.subscription.as_ref().unwrap_or(&"".to_string()),
            resourceGroupName=self.resource_group, 
            name=self.name);

        let client = reqwest::Client::new()
            .post(url)
            .header("Authorization", token)
            .header("Content-Length", 0);
        let body = client.send().await?.text().await?;
        let js = serde_json::from_str::<Properties<HashMap<String, String>>>(&body)?;
        Ok(js
            .properties
            .iter()
            .map(|(key, value)| AppserviceEnvVar {
                name: key.to_string(),
                value: value.to_string(),
            })
            .collect::<Vec<AppserviceEnvVar>>())
    }

    pub async fn update_config<'a>(
        &self,
        token: &'a str,
        config: &Vec<AppserviceEnvVar>,
    ) -> Result<()> {
        #[serde_as]
        #[derive(Serialize, Deserialize)]
        struct RequestBody {
            properties: HashMap<String, String>,
        }
        let mut update_config = HashMap::<String, String>::new();
        for c in config {
            if c.value != "".to_string() {
                update_config.insert(c.name.clone(), c.value.clone());
            }
        }

        let url = format!("https://management.azure.com/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Web/sites/{name}/config/appsettings?api-version=2023-12-01", subscriptionId=self.subscription.as_ref().unwrap_or(&"".to_string()), resourceGroupName=self.resource_group, name=self.name);
        let request_body = RequestBody {
            properties: update_config,
        };
        let client = reqwest::Client::new()
            .put(url)
            .header("Authorization", token)
            .header("Content-Type", "application/json")
            .body(serde_json::to_string(&request_body)?);
        let _ = client.send().await?.text().await?;
        Ok(())
    }
}

pub fn read_config_file(path: &Path) -> Result<Vec<AppserviceEnvVar>> {
    let file = fs::File::open(path)?;
    let buf = BufReader::new(file);
    let serialized: Vec<AppserviceEnvVar> = serde_json::from_reader(buf)?;
    Ok(serialized)
}

#[allow(dead_code)]
pub fn write_config_file(path: &Path, content: &Vec<AppserviceEnvVar>) -> Result<()> {
    fs::create_dir_all(path.parent().unwrap())?;
    let file = fs::File::create(path)?;
    let mut buf = BufWriter::new(file);
    let json_string = serde_json::to_string(content)?;
    buf.write(json_string.as_bytes())?;
    Ok(())
}
