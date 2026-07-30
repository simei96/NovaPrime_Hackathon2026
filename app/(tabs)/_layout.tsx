import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import {
  BottomTabBarProps,
  createBottomTabNavigator,
} from "@react-navigation/bottom-tabs";

import React from "react";

import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import Comunidad from "../screens/Comunidad/Comunidad";
import Home from "../screens/home/home";
import Busqueda from "../screens/Busqueda/Busqueda";
import AgendaScreen from "../screens/Agenda/Agenda";
import Favoritos from "../screens/Favoritos/Favoritos";

const Tab = createBottomTabNavigator();

// Paleta de color de la app
const COLOR_TEAL = "#2EAD9A";
const COLOR_ORANGE = "#D96E32";
const COLOR_INACTIVE = "#9AA3A8";

// Ruta central destacada 
const CENTER_ROUTE_NAME = "comunidad";

function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.tabBarWrapper} pointerEvents="box-none">
      <View style={styles.tabBarFloating}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];

          const isFocused = state.index === index;

          const isCenter = route.name === CENTER_ROUTE_NAME;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          const label =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : route.name;

          // BOTÓN CENTRAL
          if (isCenter) {
            return (
              <View key={route.key} style={styles.centerSlot}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  style={[
                    styles.centerButton,
                    isFocused && styles.centerButtonActive,
                  ]}
                >
                  {options.tabBarIcon
                    ? options.tabBarIcon({
                        color: "#FFFFFF",
                        size: 26,
                        focused: isFocused,
                      })
                    : null}
                </TouchableOpacity>

                <Text
                  numberOfLines={1}
                  style={[
                    styles.tabLabel,
                    styles.centerLabel,
                    isFocused && {
                      color: COLOR_ORANGE,
                    },
                  ]}
                >
                  {label}
                </Text>
              </View>
            );
          }

          // BOTONES NORMALES
          const color = isFocused ? COLOR_TEAL : COLOR_INACTIVE;

          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.7}
              onPress={onPress}
              onLongPress={onLongPress}
              accessibilityRole="button"
              accessibilityLabel={label}
              style={styles.tabItem}
            >
              {options.tabBarIcon
                ? options.tabBarIcon({
                    color,
                    size: 22,
                    focused: isFocused,
                  })
                : null}

              <Text numberOfLines={1} style={[styles.tabLabel, { color }]}>
                {label}
              </Text>

              {isFocused && <View style={styles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* INICIO*/}
      <Tab.Screen
        name="home"
        component={Home}
        options={{
          tabBarLabel: "Inicio",

          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" color={color} size={size} />
          ),
        }}
      />

      {/* BÚSQUEDA*/}
      <Tab.Screen
        name="Busqueda"
        component={Busqueda}
        options={{
          tabBarLabel: "Búsqueda",

          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" color={color} size={size} />
          ),
        }}
      />

      {/* COMUNIDAD*/}
      <Tab.Screen
        name="comunidad"
        component={Comunidad}
        options={{
          tabBarLabel: "Comunidad",

          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="forum" color={color} size={size} />
          ),
        }}
      />

      {/* FAVORITOS*/}
      <Tab.Screen
        name="reservas"
        component={Favoritos}
        options={{
          tabBarLabel: "Favoritos",

          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="heart" color={color} size={size} />
          ),
        }}
      />

      {/* AGENDA */}    
     <Tab.Screen
        name="agenda"
        component={AgendaScreen}
        options={{
          tabBarLabel: "Agenda",

          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="calendar"
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// DIMENSIONES
const BAR_HEIGHT = 64;
const CENTER_BUTTON_SIZE = 60;

// ESTILOS
const styles = StyleSheet.create({
  tabBarWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,

    alignItems: "center",

    zIndex: 999,
    elevation: 999,
  },

  tabBarFloating: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",

    width: "92%",
    height: BAR_HEIGHT,

    backgroundColor: "#FFFFFF",

    borderRadius: 28,

    marginBottom: Platform.OS === "ios" ? 24 : 16,

    paddingHorizontal: 6,
    paddingTop: 10,

    elevation: 10,

    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },
  },

  tabItem: {
    flex: 1,

    alignItems: "center",
    justifyContent: "flex-start",

    paddingTop: 2,
  },

  tabLabel: {
    fontSize: 10,

    marginTop: 4,

    fontFamily: "Inter",

    textAlign: "center",
  },

  activeDot: {
    width: 4,
    height: 4,

    borderRadius: 2,

    backgroundColor: COLOR_TEAL,

    marginTop: 3,
  },

  centerSlot: {
    flex: 1,

    alignItems: "center",
    justifyContent: "flex-start",
  },

  centerButton: {
    width: CENTER_BUTTON_SIZE,
    height: CENTER_BUTTON_SIZE,

    borderRadius: CENTER_BUTTON_SIZE / 2,

    backgroundColor: COLOR_ORANGE,

    alignItems: "center",
    justifyContent: "center",

    marginTop: -(CENTER_BUTTON_SIZE / 2 + 8),

    borderWidth: 4,
    borderColor: "#FFFFFF",

    elevation: 12,

    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  centerButtonActive: {
    backgroundColor: COLOR_TEAL,
  },

  centerLabel: {
    marginTop: 6,

    fontWeight: "700",

    color: "#555555",
  },
});