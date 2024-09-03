export interface Subscription {
  authorizationSource: string;
  displayName: string;
  id: string;
  state: string;
  subscriptionId: string;
  subscriptionPolicies: SubscriptionPolicies;
}

interface SubscriptionPolicies {
  locationPlacementId: string;
  quotaId: string;
  spendingLimit: string;
}

export interface Webapp {
  subscription?: string;
  name: string;
  resourceGroup: string;
}

export interface AppserviceEnvVar {
  name: string;
  value: string | null;
  isExpected: boolean;
}

export interface Env extends AppserviceEnvVar {
  previousValue: string | null;
}
