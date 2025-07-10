declare module 'react-plotly.js' {
  import { Component } from 'react';
  
  interface PlotParams {
    data: any[];
    layout?: any;
    config?: any;
    frames?: any[];
    onClick?: (event: any) => void;
    onHover?: (event: any) => void;
    onUnHover?: (event: any) => void;
    onSelected?: (event: any) => void;
    onDeselect?: (event: any) => void;
    onDoubleClick?: (event: any) => void;
    onAfterPlot?: (event: any) => void;
    onAfterExport?: (event: any) => void;
    onAfterPrint?: (event: any) => void;
    onBeforeExport?: (event: any) => void;
    onBeforeHover?: (event: any) => void;
    onBeforePrint?: (event: any) => void;
    onButtonClicked?: (event: any) => void;
    onClickAnnotation?: (event: any) => void;
    onDeselect?: (event: any) => void;
    onDoubleClick?: (event: any) => void;
    onFramework?: (event: any) => void;
    onHover?: (event: any) => void;
    onLegendClick?: (event: any) => void;
    onLegendDoubleClick?: (event: any) => void;
    onRelayout?: (event: any) => void;
    onRestyle?: (event: any) => void;
    onSelected?: (event: any) => void;
    onSelecting?: (event: any) => void;
    onSliderChange?: (event: any) => void;
    onSliderEnd?: (event: any) => void;
    onSliderStart?: (event: any) => void;
    onTransitioning?: (event: any) => void;
    onTransitionInterrupted?: (event: any) => void;
    onUnHover?: (event: any) => void;
    onUpdateMenu?: (event: any) => void;
    onUpdateSlider?: (event: any) => void;
    style?: React.CSSProperties;
    className?: string;
    divId?: string;
    debug?: boolean;
    useResizeHandler?: boolean;
    revision?: number;
    onInitialized?: (figure: any) => void;
    onUpdate?: (figure: any) => void;
    onPurge?: (figure: any) => void;
    onError?: (error: any) => void;
  }
  
  class Plot extends Component<PlotParams> {}
  
  export default Plot;
} 