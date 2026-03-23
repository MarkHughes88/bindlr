import { Image } from 'react-native';

// Import components
import { Header } from '@/src/shared/ui/Header';

export function HomeHeader() {
  return (
    <Header
        customIcon={
            <Image
                source={require('@/assets/images/logo/logo.png')}
                style={{ height: 32, width: 29 }}
                resizeMode="contain"
            />
        }
        title="Bindlr"
    >
    </Header>
  );
}