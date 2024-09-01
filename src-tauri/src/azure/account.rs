use anyhow::{Ok, Result};
use reqwest;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionPolicies {
    pub location_placement_id: String,
    pub quota_id: String,
    pub spending_limit: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Subscription {
    pub authorization_source: String,
    pub display_name: String,
    pub id: String,
    pub state: String,
    pub subscription_id: String,
    pub subscription_policies: SubscriptionPolicies,
}

#[derive(Deserialize, Debug, Clone)]
struct RestResponse {
    value: Vec<Subscription>,
}

impl Subscription {
    pub async fn list<'a>(token: &'a str) -> Result<Vec<Self>> {
        let client = reqwest::Client::new()
            .get("https://management.azure.com/subscriptions?api-version=2016-06-01")
            .header("Authorization", token);
        let body = client.send().await?.text().await?;
        let subscription = serde_json::from_str::<RestResponse>(&body)?;
        Ok(subscription.value)
    }
}
