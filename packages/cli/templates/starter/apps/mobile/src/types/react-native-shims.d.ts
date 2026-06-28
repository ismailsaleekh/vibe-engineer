declare module "react-native" {
  import type { ReactElement, ReactNode } from "react";

  export interface NativeTextProps {
    readonly children?: ReactNode;
  }

  export interface NativeViewProps {
    readonly children?: ReactNode;
  }

  export function Text(props: NativeTextProps): ReactElement;
  export function View(props: NativeViewProps): ReactElement;
}

declare module "@react-navigation/native" {
  import type { ReactElement, ReactNode } from "react";

  export interface NavigationContainerProps {
    readonly children?: ReactNode;
  }

  export function NavigationContainer(props: NavigationContainerProps): ReactElement;
}

declare module "@react-navigation/native-stack" {
  import type { ComponentType, ReactElement } from "react";

  export interface NativeStackScreenProps {
    readonly name: string;
    readonly component: ComponentType<unknown>;
  }

  export interface NativeStackNavigatorProps {
    readonly children?: ReactElement | readonly ReactElement[];
  }

  export interface NativeStackNavigator {
    readonly Navigator: (props: NativeStackNavigatorProps) => ReactElement;
    readonly Screen: (props: NativeStackScreenProps) => ReactElement;
  }

  export function createNativeStackNavigator(): NativeStackNavigator;
}
