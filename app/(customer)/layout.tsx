import { CartProvider } from "@/contexts/CartContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { QuickContact } from "@/components/layout/QuickContact";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <CartProvider>
      <MainLayout>
        {children}
      </MainLayout>
      <QuickContact />
    </CartProvider>
  );
}
