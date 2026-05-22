export interface Product {
  id: string;
  name: string;
  category: 'coffee' | 'tea' | 'food' | 'dessert';
  price: number;
  image: string;
  available: boolean;
}

export const PRODUCTS: Product[] = [
  { id: '1', name: 'Espresso Single', category: 'coffee', price: 18000, image: '☕', available: true },
  { id: '2', name: 'Caramel Macchiato', category: 'coffee', price: 28000, image: '🥛', available: true },
  { id: '3', name: 'Matcha Latte', category: 'tea', price: 26000, image: '🍵', available: true },
  { id: '4', name: 'Earl Grey Milk Tea', category: 'tea', price: 24000, image: '🍂', available: true },
  { id: '5', name: 'Croissant Butter', category: 'dessert', price: 22000, image: '🥐', available: true },
  { id: '6', name: 'Nasi Goreng Kafe', category: 'food', price: 35000, image: '🍳', available: true },
  { id: '7', name: 'Beef Burger & Fries', category: 'food', price: 38000, image: '🍔', available: true },
  { id: '8', name: 'Fudge Brownie', category: 'dessert', price: 20000, image: '🍫', available: true },
  { id: '9', name: 'Ice Americano', category: 'coffee', price: 20000, image: '🧊', available: true },
  { id: '10', name: 'Thai Tea Ice', category: 'tea', price: 22000, image: '🥤', available: true },
  { id: '11', name: 'Mie Goreng Special', category: 'food', price: 30000, image: '🍜', available: true },
  { id: '12', name: 'Waffle Strawberry', category: 'dessert', price: 25000, image: '🧇', available: true }
];
