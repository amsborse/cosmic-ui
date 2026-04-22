import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';
import { InfinityGraphic } from './InfinityGraphic';

const meta = {
  title: 'Components/InfinityGraphic/Tests',
  component: InfinityGraphic,
  args: {
    onClick: fn(),
    onHoverStart: fn(),
    onHoverEnd: fn(),
    onPointerMove: fn(),
  },
} satisfies Meta<typeof InfinityGraphic>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HoverAndClick: Story = {
  play: async ({ canvasElement, args }) => {
    const root = within(canvasElement).getByRole('img', { name: /animated infinity/i });
    await userEvent.hover(root);
    expect(args.onHoverStart).toHaveBeenCalled();
    await userEvent.click(root);
    expect(args.onClick).toHaveBeenCalled();
    await userEvent.unhover(root);
    expect(args.onHoverEnd).toHaveBeenCalled();
  },
};
