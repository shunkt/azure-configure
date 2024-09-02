import { useEffect, useState } from "react";
import { Subscription, Webapp, AppserviceEnvVar, Env } from "./lib/model";
import { invoke } from "@tauri-apps/api/tauri";
import { open } from "@tauri-apps/api/dialog";
import { exists, createDir, BaseDirectory, copyFile } from "@tauri-apps/api/fs";
import "@radix-ui/themes/styles.css";
import {
  Container,
  Heading,
  Text,
  DataList,
  Badge,
  RadioCards,
  Flex,
  Separator,
  DropdownMenu,
  Button,
  TextField,
  Spinner,
  ScrollArea,
  Box,
} from "@radix-ui/themes";
import {
  FileTextIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
} from "@radix-ui/react-icons";

function App() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [webapps, setWebapps] = useState<Webapp[]>([]);
  const [selectedWebapp, setSelectedWebapp] = useState<Webapp>();
  const [envVars, setEnvVars] = useState<Env[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterValue, setFilterValue] = useState("");

  async function fetchSubscriptions() {
    const subscriptions = await invoke("list_subscriptions");
    setSubscriptions(subscriptions as Subscription[]);
  }

  async function fetchWebapps(subscriptionId: string) {
    const webapps = await invoke("list_webapps", {
      subscription: subscriptionId,
    });
    setWebapps(webapps as Webapp[]);
  }

  async function fetchAppserviceEnvVars(webapp: Webapp) {
    const envVars: AppserviceEnvVar[] = await invoke("get_appservice_envs", {
      webapp: webapp,
    });
    setEnvVars(
      envVars.map((envVar) => ({ ...envVar, previousValue: envVar.value }))
    );
  }

  async function loadSettings() {
    const selected = await open({
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!(await exists("tmp", { dir: BaseDirectory.AppData }))) {
      await createDir("tmp", { dir: BaseDirectory.AppData, recursive: true });
    }
    if (typeof selected === "string") {
      await copyFile(selected, "default.json", { dir: BaseDirectory.AppData });
    }
  }

  useEffect(() => {
    console.log("fetching subscriptions");
    fetchSubscriptions();
  }, []);

  return (
    <Container position="relative">
      <Flex right="1" top="0" position="absolute">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <Button variant="soft">
              Option <DropdownMenu.TriggerIcon />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item onClick={async () => await loadSettings()}>
              <FileTextIcon />
              Choose Default Settings
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </Flex>
      <Heading as="h1">Azure Configure</Heading>
      <Flex py="1">
        <Heading as="h2" size="3">
          Select Subscription
        </Heading>
      </Flex>
      <Flex>
        <ScrollArea scrollbars="horizontal">
          <RadioCards.Root columns="repeat(auto-fill, 240px)">
            {subscriptions.map((subscription) => (
              <RadioCards.Item
                value={subscription.subscriptionId}
                key={subscription.subscriptionId}
                onClick={() => fetchWebapps(subscription.subscriptionId)}
              >
                <Flex direction="column">
                  <Text as="div">{subscription.displayName}</Text>
                  <DataList.Root>
                    <DataList.Item>
                      <DataList.Label>State</DataList.Label>
                      <DataList.Value>
                        <Badge radius="full" variant="soft" color="jade">
                          {subscription.state}
                        </Badge>
                      </DataList.Value>
                    </DataList.Item>
                  </DataList.Root>
                </Flex>
              </RadioCards.Item>
            ))}
          </RadioCards.Root>
        </ScrollArea>
      </Flex>
      {webapps.length > 0 && (
        <Flex direction="row" py="1" width="100%" align="center">
          <Heading as="h2" size="3">
            Select Appservice
          </Heading>
          <Flex justify="start" flexGrow="1">
            <Box flexGrow="1" pl="3">
              <TextField.Root
                value={filterValue}
                onChange={(e) => {
                  setFilterValue(e.target.value);
                }}
                placeholder="Search with name"
              >
                <TextField.Slot>
                  <MagnifyingGlassIcon />
                </TextField.Slot>
              </TextField.Root>
            </Box>
          </Flex>
        </Flex>
      )}
      <Flex>
        <ScrollArea scrollbars="horizontal">
          <RadioCards.Root columns="repeat(auto-fill, 240px)">
            {webapps
              .filter((webapp) =>
                webapp.name.toLowerCase().includes(filterValue.toLowerCase())
              )
              .map((webapp) => (
                <RadioCards.Item
                  value={webapp.name}
                  key={webapp.name + webapp.resourceGroup}
                  onClick={() => {
                    fetchAppserviceEnvVars(webapp);
                    setSelectedWebapp(webapp);
                  }}
                >
                  <Flex direction="column" width="240px">
                    <Text as="div">{webapp.name}</Text>
                    <DataList.Root>
                      <DataList.Item>
                        <DataList.Label>Resource Group</DataList.Label>
                        <DataList.Value>{webapp.resourceGroup}</DataList.Value>
                      </DataList.Item>
                    </DataList.Root>
                  </Flex>
                </RadioCards.Item>
              ))}
          </RadioCards.Root>
        </ScrollArea>
      </Flex>
      <Separator my="3" size="4" />
      {envVars.length > 0 && (
        <Heading as="h2" size="3" my="1">
          Appservice Environment Variables
        </Heading>
      )}
      <DataList.Root>
        {envVars.map((envVar) => (
          <DataList.Item key={envVar.name}>
            <DataList.Label>{envVar.name}</DataList.Label>
            <DataList.Value>
              <Flex width="100%">
                <TextField.Root
                  value={envVar.value}
                  color={
                    envVar.isExpected && !!!envVar.value ? "yellow" : "gray"
                  }
                  onChange={(e) => {
                    setEnvVars(
                      envVars.map((env) => {
                        if (env.name === envVar.name) {
                          return { ...env, value: e.target.value };
                        } else {
                          return env;
                        }
                      })
                    );
                  }}
                  style={{ width: "100%" }}
                >
                  <TextField.Slot side="right">
                    {envVar.isExpected && !!!envVar.value ? (
                      <ExclamationTriangleIcon />
                    ) : (
                      <></>
                    )}
                  </TextField.Slot>
                </TextField.Root>
              </Flex>
            </DataList.Value>
          </DataList.Item>
        ))}
      </DataList.Root>
      <Flex>
        {selectedWebapp && envVars.length > 0 && (
          <Button
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              await invoke("replace_appservice_envs", {
                webapp: selectedWebapp,
                envs: envVars,
              });
              if (selectedWebapp) {
                await fetchAppserviceEnvVars(selectedWebapp);
              }
              setLoading(false);
            }}
          >
            <Spinner loading={loading} />
            Save
          </Button>
        )}
      </Flex>
    </Container>
  );
}

export default App;
