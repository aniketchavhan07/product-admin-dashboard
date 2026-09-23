"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "../../lib/api";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const decodedId = id ? decodeURIComponent(id) : "";

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: "",
    price: "",
    stock: "",
    category: "",
    description: "",
    thumbnail: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    if (decodedId) {
      const customProducts = JSON.parse(localStorage.getItem("custom_products") || "[]");
      const foundLocal = customProducts.find((p: any) => String(p.id) === String(decodedId));

      if (foundLocal) {
        setProduct(foundLocal);
        setEditFormData({
          title: foundLocal.title || "",
          price: foundLocal.price || "",
          stock: foundLocal.stock || "",
          category: foundLocal.category || "",
          description: foundLocal.description || "",
          thumbnail: foundLocal.thumbnail || "",
        });
        setLoading(false);
      } else {
        api.get(`/products/${decodedId}`)
          .then((res) => {
            setProduct(res.data);
            setEditFormData({
              title: res.data.title || "",
              price: res.data.price || "",
              stock: res.data.stock || "",
              category: res.data.category || "",
              description: res.data.description || "",
              thumbnail: res.data.thumbnail || "",
            });
            setLoading(false);
          })
          .catch((err) => {
            setError("Product not found or failed to load.");
            setLoading(false);
          });
      }
    }
  }, [decodedId, router]);

  const handleUpdateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const updatedData = {
      ...product,
      title: editFormData.title,
      price: Number(editFormData.price),
      stock: Number(editFormData.stock),
      category: editFormData.category,
      description: editFormData.description,
      thumbnail: editFormData.thumbnail.trim() || product.thumbnail,
    };

    const customProducts = JSON.parse(localStorage.getItem("custom_products") || "[]");
    const isLocal = customProducts.some((p: any) => String(p.id) === String(decodedId));

    let updatedCustom;
    if (isLocal) {
      updatedCustom = customProducts.map((p: any) => String(p.id) === String(decodedId) ? updatedData : p);
    } else {
      updatedCustom = [updatedData, ...customProducts];
    }
    localStorage.setItem("custom_products", JSON.stringify(updatedCustom));

    setProduct(updatedData);
    setIsEditModalOpen(false);
    setSubmitting(false);
    alert("Product updated successfully!");
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      const customProducts = JSON.parse(localStorage.getItem("custom_products") || "[]");
      const isLocal = customProducts.some((p: any) => String(p.id) === String(decodedId));

      if (isLocal) {
        const updatedCustom = customProducts.filter((p: any) => String(p.id) !== String(decodedId));
        localStorage.setItem("custom_products", JSON.stringify(updatedCustom));
      } else {
        const deletedIds = JSON.parse(localStorage.getItem("deleted_products") || "[]");
        localStorage.setItem("deleted_products", JSON.stringify([...deletedIds, decodedId]));
      }

      alert("Product deleted successfully!");
      router.push("/products");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50/50">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50/50 p-6">
        <p className="text-rose-600 font-semibold">{error || "Product not found."}</p>
        <button onClick={() => router.push("/products")} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-all">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 font-sans">
      <div className="mx-auto max-w-4xl bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-8">
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
          <button onClick={() => router.push("/products")} className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
            &larr; Back to Dashboard
          </button>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="rounded-xl bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-100 transition-all"
            >
              Edit Product
            </button>
            <button 
              onClick={handleDelete}
              className="rounded-xl bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-100 transition-all"
            >
              Delete Product
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 shadow-sm">
            <img src={product.thumbnail} alt={product.title} className="w-full h-80 object-cover hover:scale-105 transition-transform duration-300" />
          </div>
          <div>
            <span className="inline-block uppercase tracking-wider bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-lg mb-3">
              {product.category}
            </span>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{product.title}</h1>
            <p className="text-3xl font-black text-indigo-600 mt-3">${product.price}</p>
            <p className="text-slate-600 text-sm mt-4 leading-relaxed">{product.description}</p>
            
            <div className="mt-6 space-y-3 text-sm text-slate-700 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
              <div className="flex justify-between"><span className="text-slate-400 font-medium">Rating:</span> <span className="font-bold text-amber-500">{product.rating || "N/A"} ⭐</span></div>
              <div className="flex justify-between"><span className="text-slate-400 font-medium">Stock Status:</span> <span className="font-bold text-slate-800">{product.stock} units available</span></div>
              <div className="flex justify-between"><span className="text-slate-400 font-medium">Brand:</span> <span className="font-bold text-slate-800">{product.brand || "Generic"}</span></div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-10 pt-8 border-t border-slate-100">
          <h3 className="text-lg font-extrabold text-slate-900 mb-4 tracking-tight">Customer Reviews</h3>
          {product.reviews && product.reviews.length > 0 ? (
            <div className="space-y-4">
              {product.reviews.map((rev: any, index: number) => (
                <div key={index} className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-900 text-sm">{rev.reviewerName || "Anonymous"}</span>
                    <span className="text-amber-500 text-xs font-bold">{rev.rating} ⭐</span>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">{rev.comment}</p>
                  <span className="text-[10px] text-slate-400 mt-2 block">
                    {rev.date ? new Date(rev.date).toLocaleDateString() : ""}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">No reviews available for this item.</p>
          )}
        </div>

        {/* Edit Product Modal */}
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto border border-slate-100">
              <h2 className="mb-6 text-xl font-extrabold text-slate-900 tracking-tight">Edit Product</h2>
              <form onSubmit={handleUpdateProduct} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Title</label>
                  <input
                    type="text"
                    required
                    value={editFormData.title}
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Price ($)</label>
                    <input
                      type="number"
                      required
                      value={editFormData.price}
                      onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Stock</label>
                    <input
                      type="number"
                      required
                      value={editFormData.stock}
                      onChange={(e) => setEditFormData({ ...editFormData, stock: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Category</label>
                  <input
                    type="text"
                    required
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none capitalize"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Image URL</label>
                  <input
                    type="url"
                    value={editFormData.thumbnail}
                    onChange={(e) => setEditFormData({ ...editFormData, thumbnail: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Description</label>
                  <textarea
                    rows={3}
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 shadow-sm disabled:opacity-50 transition-all"
                  >
                    {submitting ? "Saving..." : "Save Changes"}
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