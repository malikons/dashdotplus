import type { Transient } from '@dashdotplus/common';
import { motion } from 'framer-motion';
import { forwardRef } from 'react';
import styled from 'styled-components';
import { useIsMobile } from '../services/mobile';

type SCProps = Transient<
  Pick<GlassPaneProps, 'grow' | 'minWidth'> & { mobile: boolean }
>;

const Container = styled.div<SCProps>`
  min-width: ${({ $minWidth, $mobile }) => ($mobile ? 0 : $minWidth)}px;
  width: ${({ $mobile }) => ($mobile ? '100%' : 'unset')};
  min-height: 360px;
  max-height: ${({ $mobile }) => ($mobile ? 'unset' : '500px')};

  flex-grow: ${({ $grow }) => $grow ?? 1};
  flex-basis: ${({ $mobile }) => ($mobile ? 'unset' : '0')};
  transition: opacity 0.3 ease-in-out;

  display: flex;
  backdrop-filter: ${({ theme }) => theme.pane.backdropFilter};
  background: ${({ theme }) => theme.pane.background};
  border-radius: ${({ theme }) => theme.pane.radius};
  border: ${({ theme }) => theme.pane.border};
  box-shadow: ${({ theme }) => theme.pane.shadow};
`;

type GlassPaneProps = {
  grow?: number;
  minWidth?: number;
  enableTilt?: boolean;
  children?: React.ReactNode;
};

export const GlassPane = motion(
  forwardRef<HTMLDivElement, GlassPaneProps>((props, ref) => {
    const isMobile = useIsMobile();

    return (
      <Container
        ref={ref}
        $mobile={isMobile}
        $grow={props.grow ?? 1}
        $minWidth={props.minWidth ?? 350}
      >
        {props.children}
      </Container>
    );
  }),
);
