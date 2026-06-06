import React,{useState} from "react";
import useSEO from "../hooks/useSEO";
import ProductCard from "../components/ui/ProductCard";

const Wishlist = () => {
  const SeoComponent = useSEO({
    title: "My Wishlist | Pyonea",
    description: "Your saved products on Pyonea — Myanmar's trusted B2B marketplace.",
    url: "/wishlist",
    noindex: true,
  });

  const [wishlistItems] = useState([
    { id: 1, name: "Premium Rice", price: 12000, moq: 50, stock: 500 },
    { id: 2, name: "Construction Cement", price: 8500, moq: 100, stock: 2000 },
    { id: 3, name: "Handwoven Textiles", price: 4500, moq: 20, stock: 300 },
    { id: 4, name: "Teak Wood Furniture", price: 185000, moq: 5, stock: 50 }
  ]);

  return (
    <>
      {SeoComponent}
      <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-8 dark:text-slate-100">Your Wishlist</h1>

      {wishlistItems.length === 0
        ? <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-8 max-w-lg mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4 dark:text-slate-100">Your Wishlist is Empty</h2>
            <p className="text-gray-600 dark:text-slate-400 mb-6">
              Save products you're interested in to your wishlist for easy
              access later.
            </p>
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700">
              Browse Products
            </button>
          </div>
        : <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {wishlistItems.map(product =>
              <div key={product.id} className="relative">
                <ProductCard product={product} />
                <button className="absolute top-2 right-2 bg-white dark:bg-slate-700 p-2 rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-slate-600">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-red-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>}
    </div>
    </>
  );
};

export default Wishlist;