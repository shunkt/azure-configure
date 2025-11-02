import { Text, DataList, RadioCards, Flex, Skeleton } from "@radix-ui/themes";

import { Webapp } from "../lib/model";

export default function SubscriptionCard({
  webapp,
  onClick,
  isLoading = false,
}: {
  webapp: Webapp;
  onClick: (webapp: Webapp) => void;
  isLoading?: boolean;
}) {
  return (
    <RadioCards.Item
      value={webapp.name}
      key={webapp.name + webapp.resourceGroup}
      onClick={() => onClick(webapp)}
    >
      <Flex direction="column" width="240px">
        <Skeleton loading={isLoading}>
          <Text as="div">{webapp.name}</Text>
        </Skeleton>
        <DataList.Root>
          <DataList.Item>
            <DataList.Label>Resource Group</DataList.Label>
            <Skeleton loading={isLoading}>
              <DataList.Value>
                <Text as="div">{webapp.resourceGroup}</Text>
              </DataList.Value>
            </Skeleton>
          </DataList.Item>
        </DataList.Root>
      </Flex>
    </RadioCards.Item>
  );
}

export const dummyWebapp: Webapp = {
  name: "dummy",
  resourceGroup: "dummy",
};
