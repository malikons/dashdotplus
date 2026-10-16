import { Switch } from 'antd';
import styled from 'styled-components';
import { ThemedText } from './text';

const Row = styled.div<{ $positioned: boolean }>`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 15px;

  /* stands on its own in the widget's top-right corner unless it was handed
     to a WidgetControls row, in which case that row does the positioning */
  ${({ $positioned }) =>
    $positioned &&
    `
    position: absolute;
    right: 25px;
    top: 25px;
    z-index: 2;
  `}
`;

type WidgetSwitchProps = {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** render bare, for when the switch is already inside a WidgetControls row */
  inline?: boolean;
};

export const WidgetSwitch = ({
  label,
  checked,
  onChange,
  inline,
}: WidgetSwitchProps) => (
  <Row $positioned={!inline}>
    <ThemedText>{label}</ThemedText>
    <Switch checked={checked} onChange={onChange} title={label} />
  </Row>
);
