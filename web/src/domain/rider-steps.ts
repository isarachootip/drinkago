import { OrderStatus } from '../api/schemas';
import { translate, TranslationKey } from '../i18n';

export type RiderStepState = 'done' | 'current' | 'locked';
export type RiderTargetLocation = 'station' | 'customer';
export type StepTranslator = (key: TranslationKey) => string;

export interface RiderWorkflowStep {
  stepNumber: number;
  title: string;
  subtitle: string;
  actionLabel: string;
  buttonColor: string;
  state: RiderStepState;
  targetLocation: RiderTargetLocation;
}

export function getRiderCurrentStepNumber(status: OrderStatus, isClaimed = true): number {
  switch (status) {
    case 'CONFIRMED':
      return isClaimed ? 2 : 1;
    case 'PACKED':
      return 3;
    case 'PICKED_UP':
      return 4;
    case 'OUT_FOR_DELIVERY':
      return 5;
    default:
      return 6;
  }
}

export function getRiderTargetLocation(status: OrderStatus, isClaimed = true): RiderTargetLocation {
  return getRiderCurrentStepNumber(status, isClaimed) <= 3 ? 'station' : 'customer';
}

const defaultTranslate: StepTranslator = (key) => translate('th', key);

export function getRiderWorkflowSteps(
  status: OrderStatus,
  isClaimed = true,
  t: StepTranslator = defaultTranslate,
): RiderWorkflowStep[] {
  const currentStep = getRiderCurrentStepNumber(status, isClaimed);
  const definitions: Omit<RiderWorkflowStep, 'state'>[] = [
    {
      stepNumber: 1,
      title: t('rStep1Title'),
      subtitle: t('rStep1Sub'),
      actionLabel: t('rStep1Btn'),
      buttonColor: '#0F172A',
      targetLocation: 'station',
    },
    {
      stepNumber: 2,
      title: t('rStep2Title'),
      subtitle: t('rStep2Sub'),
      actionLabel: t('rStep2Btn'),
      buttonColor: '#1D4ED8',
      targetLocation: 'station',
    },
    {
      stepNumber: 3,
      title: t('rStep3Title'),
      subtitle: t('rStep3Sub'),
      actionLabel: t('rStep3Btn'),
      buttonColor: '#1D4ED8',
      targetLocation: 'station',
    },
    {
      stepNumber: 4,
      title: t('rStep4Title'),
      subtitle: t('rStep4Sub'),
      actionLabel: t('rStep4Btn'),
      buttonColor: '#1D4ED8',
      targetLocation: 'customer',
    },
    {
      stepNumber: 5,
      title: t('rStep5Title'),
      subtitle: t('rStep5Sub'),
      actionLabel: t('rStep5Btn'),
      buttonColor: '#059669',
      targetLocation: 'customer',
    },
  ];

  return definitions.map((def) => ({
    ...def,
    state: def.stepNumber < currentStep ? 'done' : def.stepNumber === currentStep ? 'current' : 'locked',
  }));
}

export function getRiderCurrentStepSummary(
  status: OrderStatus,
  isClaimed = true,
  t: StepTranslator = defaultTranslate,
): string {
  const steps = getRiderWorkflowSteps(status, isClaimed, t);
  const activeStep = steps.find((s) => s.state === 'current');
  return activeStep ? activeStep.title : status;
}
