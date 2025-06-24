import React from 'react';

import MobileAppImportSteps from '@/ui/components/import-components/mobile-app-import-steps';

export default {
  title: 'View/Welcome/AccountImport/MobileAppImportSteps',
  tags: ['autodocs'],

  component: MobileAppImportSteps,
  argTypes: {
    isLogin: {
      control: 'boolean',
    },
  },
};

export const Default = (args: { isLogin: boolean }) => <MobileAppImportSteps {...args} />;
