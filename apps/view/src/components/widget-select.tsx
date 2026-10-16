import { Select } from 'antd';
import styled from 'styled-components';
import { ThemedText } from './text';

const Row = styled.div<{ $positioned: boolean }>`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 15px;

  ${({ $positioned }) =>
    $positioned &&
    `
    position: absolute;
    right: 25px;
    top: 25px;
    z-index: 2;
  `}
`;

// antd sizes itself to the longest label, which would otherwise shift the
// widget's header around whenever the selection changes
const StyledSelect = styled(Select)`
  min-width: 105px;
`;

export type SelectOption = {
  value: string;
  label: string;
};

type WidgetSelectProps = {
  label?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  /** render bare, for when the select is already inside a WidgetControls row */
  inline?: boolean;
};

export const WidgetSelect = ({
  label,
  value,
  options,
  onChange,
  inline,
}: WidgetSelectProps) => (
  <Row $positioned={!inline}>
    {label ? <ThemedText>{label}</ThemedText> : null}
    <StyledSelect
      size="small"
      value={value}
      options={options}
      onChange={(next) => onChange(next as string)}
      title={label}
      popupMatchSelectWidth={false}
      // the popup renders outside the widget, so it only picks up the theme
      // through antd's own tokens
      styles={{ popup: { root: { minWidth: 105 } } }}
    />
  </Row>
);
