import React from 'react';
import { Button } from 'react-native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { TabParamList } from '../navigation/types'; // Adjust path if needed

type HomeScreenNavigationProp = BottomTabNavigationProp<TabParamList, 'Home'>;

type Props = {
  navigation: HomeScreenNavigationProp;
};

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <Button
      title="Go to Explore"
      onPress={() => navigation.navigate('Explore')}
    />
  );
};

export default HomeScreen;
