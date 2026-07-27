import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    custom: {
      status: {
        success: { bg: string; text: string; border: string; darkBg: string };
        error: { bg: string; text: string; border: string; darkBg: string };
        warning: { bg: string; text: string; border: string; darkBg: string };
        info: { bg: string; text: string; border: string; darkBg: string };
      };
      brand: {
        lightest: string;
        lighter: string;
        light: string;
        main: string;
        dark: string;
        darker: string;
        alpha8: string;
        alpha12: string;
      };
      surface: {
        raised: string;
        sunken: string;
        muted: string;
      };
      purple: { main: string; light: string; bg: string; text: string };
      orange: { main: string; light: string; dark: string; darker: string; bg: string; text: string };
      cyan: { main: string; light: string; dark: string; bg: string; text: string };
      pink: { main: string; light: string; bg: string; text: string };
      lime: { main: string; light: string; bg: string; text: string };
      rose: { main: string; light: string; bg: string; text: string };
    };
  }
  interface PaletteOptions {
    custom?: {
      status?: {
        success?: { bg?: string; text?: string; border?: string; darkBg?: string };
        error?: { bg?: string; text?: string; border?: string; darkBg?: string };
        warning?: { bg?: string; text?: string; border?: string; darkBg?: string };
        info?: { bg?: string; text?: string; border?: string; darkBg?: string };
      };
      brand?: {
        lightest?: string;
        lighter?: string;
        light?: string;
        main?: string;
        dark?: string;
        darker?: string;
        alpha8?: string;
        alpha12?: string;
      };
      surface?: {
        raised?: string;
        sunken?: string;
        muted?: string;
      };
      purple?: { main?: string; light?: string; bg?: string; text?: string };
      orange?: { main?: string; light?: string; dark?: string; darker?: string; bg?: string; text?: string };
      cyan?: { main?: string; light?: string; dark?: string; bg?: string; text?: string };
      pink?: { main?: string; light?: string; bg?: string; text?: string };
      lime?: { main?: string; light?: string; bg?: string; text?: string };
      rose?: { main?: string; light?: string; bg?: string; text?: string };
    };
  }
}
