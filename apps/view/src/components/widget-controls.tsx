import styled from 'styled-components';

/**
 * The controls that share a widget's top-right corner.
 *
 * This sits in normal flow rather than being pinned to the corner, so it can
 * never overlap whatever else is on that line. `margin-left: auto` keeps it
 * right-aligned, and wrapping lets it drop onto its own line instead of
 * colliding when the widget is too narrow for everything at once.
 */
export const WidgetControls = styled.div`
  margin-left: auto;

  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 15px;
`;
