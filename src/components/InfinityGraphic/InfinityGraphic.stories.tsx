import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { InfinityGraphic } from './InfinityGraphic';

const meta = {
  title: 'Components/InfinityGraphic',
  component: InfinityGraphic,
  parameters: {
    layout: 'padded',
    actions: { handles: ['onClick', 'onHoverStart', 'onHoverEnd', 'onPointerMove'] },
  },
  args: {
    mode: 'dark',
    state: 'calm',
    showPaths: true,
    interactive: true,
    followCursor: true,
    cursorInfluence: 0.18,
    glowIntensity: 1,
    particleCount: 8,
    speed: 1,
    onClick: fn(),
    onHoverStart: fn(),
    onHoverEnd: fn(),
    onPointerMove: fn(),
  },
  argTypes: {
    mode: { control: 'inline-radio', options: ['dark', 'light'] },
    state: { control: 'select', options: ['calm', 'charged', 'cosmic', 'focused'] },
    showPaths: { control: 'boolean' },
    interactive: { control: 'boolean' },
    followCursor: { control: 'boolean' },
    cursorInfluence: { control: { type: 'range', min: 0, max: 1, step: 0.01 } },
    glowIntensity: { control: { type: 'range', min: 0.4, max: 2.5, step: 0.05 } },
    particleCount: { control: { type: 'range', min: 0, max: 30, step: 1 } },
    speed: { control: { type: 'range', min: 0.25, max: 3, step: 0.05 } },
    onClick: { action: 'onClick' },
    onHoverStart: { action: 'onHoverStart' },
    onHoverEnd: { action: 'onHoverEnd' },
    onPointerMove: { action: 'onPointerMove' },
  },
} satisfies Meta<typeof InfinityGraphic>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Light: Story = {
  args: { mode: 'light' },
};

export const InteractiveHover: Story = {
  args: {
    interactive: true,
    followCursor: true,
    cursorInfluence: 0.26,
    glowIntensity: 1.1,
  },
};

export const CenterPulse: Story = {
  name: 'Center pulse',
  args: {
    interactive: true,
    glowIntensity: 1.15,
    state: 'focused',
  },
};

export const ClickRipple: Story = {
  name: 'Click ripple',
  args: {
    interactive: true,
    state: 'calm',
  },
};

export const Calm: Story = {
  args: { state: 'calm', glowIntensity: 0.95 },
};

export const Charged: Story = {
  args: {
    state: 'charged',
    glowIntensity: 1.2,
    particleCount: 14,
    speed: 1.1,
  },
};
