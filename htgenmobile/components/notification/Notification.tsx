import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View, Platform, StatusBar } from "react-native";
import { COLORS } from "@/constants/colors";
import type { NotificationData } from "@/contexts/NotificationContext";

interface NotificationProps {
  notification: NotificationData;
  onHide: () => void;
}

export const Notification: React.FC<NotificationProps> = ({ notification, onHide }) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide in animation
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleHide = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  const getIcon = () => {
    const iconSize = 24;
    const iconColor = getIconColor();
    switch (notification.type) {
      case "success":
        return <CheckCircle2 size={iconSize} color={iconColor} fill={iconColor} />;
      case "error":
        return <XCircle size={iconSize} color={iconColor} fill={iconColor} />;
      case "warning":
        return <AlertTriangle size={iconSize} color={iconColor} fill={iconColor} />;
      case "info":
        return <Info size={iconSize} color={iconColor} fill={iconColor} />;
    }
  };

  const getBackgroundColor = () => {
    switch (notification.type) {
      case "success":
        return "#10B981"; // emerald-500
      case "error":
        return "#EF4444"; // red-500
      case "warning":
        return "#F59E0B"; // amber-500
      case "info":
        return "#3B82F6"; // blue-500
    }
  };

  const getIconColor = () => {
    return "#FFFFFF";
  };

  const backgroundColor = getBackgroundColor();

  const topPadding = Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 8 : 8;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
          paddingTop: topPadding,
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={[styles.notification, { backgroundColor }]}
        activeOpacity={0.9}
        onPress={notification.onPress}
        onLongPress={handleHide}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>{getIcon()}</View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>{notification.title}</Text>
            {notification.message && (
              <Text style={styles.message}>{notification.message}</Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleHide}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  notification: {
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    fontWeight: "500",
    color: "#FFFFFF",
    opacity: 0.95,
    lineHeight: 18,
  },
  closeButton: {
    marginLeft: 8,
    padding: 4,
  },
});
