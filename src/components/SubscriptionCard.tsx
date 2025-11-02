import {
  Text,
  DataList,
  Badge,
  RadioCards,
  Flex,
  Skeleton,
} from "@radix-ui/themes";

import { Subscription } from "../lib/model";

export default function SubscriptionCard({
  subscription,
  onClick,
  isLoading = false,
}: {
  subscription: Subscription;
  onClick: (subscriptionId: string) => void;
  isLoading?: boolean;
}) {
  return (
    <RadioCards.Item
      value={subscription.subscriptionId}
      key={subscription.subscriptionId}
      onClick={() => onClick(subscription.subscriptionId)}
    >
      <Flex direction="column">
        <Skeleton loading={isLoading}>
          <Text as="div">{subscription.displayName}</Text>
        </Skeleton>
        <DataList.Root>
          <DataList.Item>
            <DataList.Label>State</DataList.Label>
            <Skeleton loading={isLoading}>
              <DataList.Value>
                <Badge radius="full" variant="soft" color="jade">
                  {subscription.state}
                </Badge>
              </DataList.Value>
            </Skeleton>
          </DataList.Item>
        </DataList.Root>
      </Flex>
    </RadioCards.Item>
  );
}

export const dummySubscription: Subscription = {
  subscriptionId: "1111",
  displayName: "Dummy Subscription",
  state: "Active",
  authorizationSource: "Manual",
  id: "dummy-id",
  subscriptionPolicies: {
    locationPlacementId: "dummy-location",
    quotaId: "dummy-quota",
    spendingLimit: "dummy-spending-limit",
  },
};
