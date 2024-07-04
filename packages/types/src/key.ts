import type { InstanceType } from './clerk';

export type PublishableKey = {
  frontendApi: string;
  instanceType: InstanceType;
};

export type EphemeralKeys = {
  publishableKey: string;
  secretKey: string;
  expiresAt: number;
};
