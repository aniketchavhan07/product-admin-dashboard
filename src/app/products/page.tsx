"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "../lib/api";

function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const pageParam = Number(searchParams.get("page")) || 1;
  const limitParam = Number(searchParams.get("limit")) || 10;
  const searchParam = searchParams.get("search") || "";
  const categoryParam = searchParams.get("category") || "";
  const sortByParam = searchParams.get("sortBy") || "";
  const orderParam = searchParams.get("order") || "asc";

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState(searchParam);
  const latestReqTimestamp = useRef(0);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    price: "",
    category: "",
    stock: "",
    description: "",
    thumbnail: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      
      const newProduct = {
        id: `local-${Date.now()}`,
        title: formData.title,
        price: Number(formData.price),
        category: formData.category,
        stock: Number(formData.stock),
        description: formData.description,
        thumbnail: formData.thumbnail.trim() || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400",
        rating: 5.0,
      };

      const existingCustom = JSON.parse(localStorage.getItem("custom_products") || "[]");
      const updatedCustom = [newProduct, ...existingCustom];
      localStorage.setItem("custom_products", JSON.stringify(updatedCustom));

      setProducts([newProduct, ...products]);
      setTotal(total + 1);
      setIsAddModalOpen(false);
      setFormData({ title: "", price: "", category: "", stock: "", description: "", thumbnail: "" });
    } catch (err) {
      alert("Failed to add product.");
    } finally {
      setSubmitting(false);
    }
  };

  const updateURL = (params: Record<string, string | number>) => {
    const current = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        current.set(key, String(value));
      } else {
        current.delete(key);
      }
    });
    router.push(`?${current.toString()}`);
  };

  useEffect(() => {
    api.get("/products/categories")
      .then((res) => {
        const cats = res.data.map((c: any) => typeof c === "string" ? c : c.slug);
        setCategories(cats);
      })
      .catch((err) => console.error("Failed to load categories", err));
  }, []);

  const fetchProducts = useCallback(async () => {
    const reqTime = Date.now();
    latestReqTimestamp.current = reqTime;

    try {
      setLoading(true);
      setError(null);

      const skip = (pageParam - 1) * limitParam;
      let url = `/products?limit=${limitParam}&skip=${skip}`;

      if (searchParam) {
        url = `/products/search?q=${encodeURIComponent(searchParam)}&limit=${limitParam}&skip=${skip}`;
      } else if (categoryParam) {
        url = `/products/category/${categoryParam}?limit=${limitParam}&skip=${skip}`;
      } else if (sortByParam) {
        url = `/products?sortBy=${sortByParam}&order=${orderParam}&limit=${limitParam}&skip=${skip}`;
      }

      const res = await api.get(url);

      if (reqTime < latestReqTimestamp.current) return;

      let fetchedProducts = res.data.products || [];
      let fetchedTotal = res.data.total || 0;

      const deletedIds = JSON.parse(localStorage.getItem("deleted_products") || "[]");
      fetchedProducts = fetchedProducts.filter((p: any) => !deletedIds.includes(String(p.id)));

      if (pageParam === 1 && !searchParam && !categoryParam && !sortByParam) {
        const customProducts = JSON.parse(localStorage.getItem("custom_products") || "[]");
        fetchedProducts = [...customProducts, ...fetchedProducts];
        fetchedTotal += customProducts.length;
      }

      setProducts(fetchedProducts);
      setTotal(fetchedTotal);
    } catch (err) {
      if (reqTime >= latestReqTimestamp.current) {
        setError("Failed to fetch products. Please retry.");
      }
    } finally {
      if (reqTime >= latestReqTimestamp.current) {
        setLoading(false);
      }
    }
  }, [pageParam, limitParam, searchParam, categoryParam, sortByParam, orderParam]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchProducts();
  }, [fetchProducts, router]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm !== searchParam) {
        updateURL({ search: searchTerm, page: 1 });
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [searchTerm, searchParam]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  const totalPages = Math.ceil(total / limitParam) || 1;

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 font-sans">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Product Admin Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">Manage catalog inventory, pricing, and system details effortlessly.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsAddModalOpen(true)} 
              className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-all active:scale-95"
            >
              + Add Product
            </button>
            <button 
              onClick={handleLogout} 
              className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-all active:scale-95"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="relative">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50/50 transition-all"
            />
          </div>

          <select
            value={categoryParam}
            onChange={(e) => updateURL({ category: e.target.value, search: "", sortBy: "", page: 1 })}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50/50 capitalize transition-all"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat} className="capitalize">
                {cat}
              </option>
            ))}
          </select>

          <select
            value={sortByParam}
            onChange={(e) => updateURL({ sortBy: e.target.value, category: "", search: "", page: 1 })}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50/50 transition-all"
          >
            <option value="">Sort By</option>
            <option value="title">Title</option>
            <option value="price">Price</option>
            <option value="rating">Rating</option>
          </select>

          <div className="flex items-center justify-between md:justify-end gap-3 px-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Rows:</span>
            <select
              value={limitParam}
              onChange={(e) => updateURL({ limit: Number(e.target.value), page: 1 })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none bg-slate-50/50"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent align-[-0.125em]"></div>
            <p className="mt-4 text-sm font-medium text-slate-500">Loading inventory catalog...</p>
          </div>
        ) : error ? (
          <div className="py-20 text-center bg-white rounded-2xl shadow-sm border border-slate-100">
            <p className="mb-4 text-sm font-medium text-rose-600">{error}</p>
            <button onClick={fetchProducts} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 shadow-sm">
              Retry Connection
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="py-24 text-center bg-white rounded-2xl shadow-sm border border-slate-100">
            <p className="text-sm font-medium text-slate-500">No products found matching your filters.</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-100">
              <table className="w-full border-collapse text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="p-4">Image</th>
                    <th className="p-4">Title</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Price</th>
                    <th className="p-4">Rating</th>
                    <th className="p-4">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => (
                    <tr 
                      key={p.id} 
                      onClick={() => router.push(`/products/${p.id}`)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      <td className="p-4">
                        <img src={p.thumbnail} alt={p.title} className="h-12 w-12 rounded-xl object-cover border border-slate-200/60 shadow-sm group-hover:scale-105 transition-transform" />
                      </td>
                      <td className="p-4 font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{p.title}</td>
                      <td className="p-4 capitalize">
                        <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {p.category}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-slate-900">${p.price}</td>
                      <td className="p-4 text-amber-500 font-medium">{p.rating} ⭐</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${p.stock < 10 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          {p.stock} units
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-4 md:hidden">
              {products.map((p) => (
                <div 
                  key={p.id} 
                  onClick={() => router.push(`/products/${p.id}`)}
                  className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100 flex gap-4 items-center cursor-pointer hover:border-indigo-200 transition-all active:scale-[0.99]"
                >
                  <img src={p.thumbnail} alt={p.title} className="h-20 w-20 rounded-xl object-cover border border-slate-100 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 capitalize mb-1">
                      {p.category}
                    </span>
                    <h3 className="font-bold text-slate-900 truncate">{p.title}</h3>
                    <p className="text-sm font-extrabold text-indigo-600 mt-1">${p.price} <span className="text-slate-400 font-normal text-xs">| Stock: {p.stock}</span></p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-sm font-medium text-slate-500">
                Showing <span className="font-bold text-slate-800">{total === 0 ? 0 : (pageParam - 1) * limitParam + 1}</span> to <span className="font-bold text-slate-800">{Math.min(pageParam * limitParam, total)}</span> of <span className="font-bold text-slate-800">{total}</span> results
              </p>

              <div className="flex items-center gap-2">
                <button
                  disabled={pageParam <= 1}
                  onClick={() => updateURL({ page: pageParam - 1 })}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-all"
                >
                  Previous
                </button>
                <span className="text-sm font-semibold text-slate-700 px-3">
                  Page {pageParam} of {totalPages}
                </span>
                <button
                  disabled={pageParam >= totalPages}
                  onClick={() => updateURL({ page: pageParam + 1 })}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}

        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto border border-slate-100">
              <h2 className="mb-6 text-xl font-extrabold text-slate-900 tracking-tight">Add New Product</h2>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Enter product title"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Price ($)</label>
                    <input
                      type="number"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Stock</label>
                    <input
                      type="number"
                      required
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Category</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 capitalize bg-white"
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat} className="capitalize">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Image URL</label>
                  <input
                    type="url"
                    value={formData.thumbnail}
                    onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Enter detailed description"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 shadow-sm disabled:opacity-50 transition-all"
                  >
                    {submitting ? "Adding..." : "Confirm Product"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-500">Loading catalog...</div>}>
      <ProductsContent />
    </Suspense>
  );
}