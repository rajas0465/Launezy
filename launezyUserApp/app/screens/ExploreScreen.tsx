import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';

const shops = [
  { id: '1', name: 'Easy Wash', rating: '4.8', distance: '1.5 KM', description: 'Eco-friendly detergents, quick wash' },
  { id: '2', name: 'Quick Clean', rating: '4.6', distance: '2 KM', description: 'Steam iron, dry clean' },
];

export default function ExploreScreen() {
  const renderShopItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.shopCard}>
      <Text style={styles.shopName}>{item.name}</Text>
      <Text style={styles.shopDetails}>{item.description}</Text>
      <Text style={styles.shopMeta}>
        Rating: {item.rating} | {item.distance}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Explore Shops</Text>
      <FlatList
        data={shops}
        keyExtractor={(item) => item.id}
        renderItem={renderShopItem}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  listContainer: {
    paddingBottom: 20,
  },
  shopCard: {
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    backgroundColor: '#F9F9F9',
  },
  shopName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  shopDetails: {
    fontSize: 14,
    color: '#666',
    marginVertical: 4,
  },
  shopMeta: {
    fontSize: 12,
    color: '#999',
  },
});
