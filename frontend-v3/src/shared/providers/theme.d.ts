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
    };
  }
}
