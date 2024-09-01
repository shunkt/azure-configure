use serde::Deserialize;

#[derive(Deserialize, Debug)]
pub struct ResponseBody<T> {
    pub value: Vec<Properties<T>>,
}

#[derive(Deserialize, Debug)]
pub struct Properties<T> {
    pub properties: T,
}
