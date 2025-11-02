import { useEffect, useState } from "react";
import { Subscription, Webapp, AppserviceEnvVar, Env } from "./lib/model";
import { createDotenv } from "./lib/action";
import { invoke } from "@tauri-apps/api/core";
import { open, save, message } from "@tauri-apps/plugin-dialog";
import { trace } from "tauri-plugin-log-api";
import {
  exists,
  mkdir,
  BaseDirectory,
  copyFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import "@radix-ui/themes/styles.css";
import {
  Container,
  Heading,
  Text,
  DataList,
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
  CopyIcon,
} from "@radix-ui/react-icons";

import SubscriptionCard, {
  dummySubscription,
} from "./components/SubscriptionCard";

import AppserviceCard, { dummyWebapp } from "./components/AppserviceCard";

function App() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [webapps, setWebapps] = useState<Webapp[]>([]);
  const [selectedWebapp, setSelectedWebapp] = useState<Webapp>();
  const [envVars, setEnvVars] = useState<Env[]>([]);

  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [loadingWebapps, setLoadingWebapps] = useState(false);

  const [filterValue, setFilterValue] = useState("");

  async function fetchSubscriptions() {
    setLoadingSubscription(true);
    try {
      const subscriptions = await invoke("list_subscriptions");
      setSubscriptions(subscriptions as Subscription[]);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
    }
    setLoadingSubscription(false);
  }

  async function fetchWebapps(subscriptionId: string) {
    setLoadingWebapps(true);
    const webapps = await invoke("list_webapps", {
      subscription: subscriptionId,
    });
    setWebapps(webapps as Webapp[]);
    setLoadingWebapps(false);
  }

  async function fetchAppserviceEnvVars(webapp: Webapp) {
    const envVars: AppserviceEnvVar[] = await invoke("get_appservice_envs", {
      webapp: webapp,
    });
    trace(`envVars: ${JSON.stringify(envVars)}`);
    setEnvVars(() =>
      envVars.map((envVar) => ({ ...envVar, previousValue: envVar.value }))
    );
  }

  async function loadSettings() {
    const selected = await open({
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!(await exists("tmp", { baseDir: BaseDirectory.AppData }))) {
      await mkdir("tmp", { baseDir: BaseDirectory.AppData, recursive: true });
    }
    if (typeof selected === "string") {
      await copyFile(selected, "default.json", {
        toPathBaseDir: BaseDirectory.AppData,
      });
    }
  }

  async function saveEnvAsFile() {
    const filepath = await save({ defaultPath: ".env" });
    if (filepath === null) {
      await message("Failed save file", "Save");
    } else {
      await writeTextFile(filepath, createDotenv(envVars));
    }
  }

  useEffect(() => {
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
            <DropdownMenu.Item
              onClick={async () => await saveEnvAsFile()}
              disabled={envVars.length === 0}
            >
              <FileTextIcon />
              Save As...
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
          <RadioCards.Root columns="repeat(auto-fill, 256px)">
            {loadingSubscription ? (
              <SubscriptionCard
                subscription={dummySubscription}
                onClick={() => {}}
                isLoading={loadingSubscription}
              />
            ) : (
              <>
                {subscriptions.map((subscription) => (
                  <SubscriptionCard
                    key={subscription.subscriptionId}
                    subscription={subscription}
                    onClick={fetchWebapps}
                  />
                ))}
              </>
            )}
          </RadioCards.Root>
        </ScrollArea>
      </Flex>
      {(webapps.length > 0 || loadingWebapps) && (
        <Flex direction="row" py="1" width="100%" align="center">
          <Heading as="h2" size="3">
            Select AppService
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
          <RadioCards.Root columns="repeat(auto-fill, 256px)">
            {loadingWebapps ? (
              <AppserviceCard
                webapp={dummyWebapp}
                onClick={() => {}}
                isLoading={loadingWebapps}
              />
            ) : (
              <>
                {webapps
                  .filter((webapp) =>
                    webapp.name
                      .toLowerCase()
                      .includes(filterValue.toLowerCase())
                  )
                  .map((webapp) => (
                    <AppserviceCard
                      webapp={webapp}
                      onClick={() => {
                        fetchAppserviceEnvVars(webapp);
                        setSelectedWebapp(webapp);
                      }}
                    />
                  ))}
              </>
            )}
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
                  value={envVar.value ?? ""}
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
                    {envVar.isExpected && !envVar.value ? (
                      <ExclamationTriangleIcon />
                    ) : (
                      <></>
                    )}
                  </TextField.Slot>
                </TextField.Root>
                <Flex align="center" ml="1">
                  <CopyIcon
                    cursor="pointer"
                    onClick={() => {
                      navigator.clipboard.writeText(envVar.value ?? "");
                    }}
                  />
                </Flex>
              </Flex>
            </DataList.Value>
          </DataList.Item>
        ))}
      </DataList.Root>
      <Flex>
        {selectedWebapp && envVars.length > 0 && (
          <Button
            disabled={loadingSubscription}
            onClick={async () => {
              setLoadingSubscription(true);
              await invoke("replace_appservice_envs", {
                webapp: selectedWebapp,
                envs: envVars,
              });
              if (selectedWebapp) {
                await fetchAppserviceEnvVars(selectedWebapp);
              }
              setLoadingSubscription(false);
            }}
          >
            <Spinner loading={loadingSubscription} />
            Save
          </Button>
        )}
      </Flex>
    </Container>
  );
}

export default App;
