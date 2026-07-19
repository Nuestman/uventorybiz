import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Minus, Package, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { PORTAL_ORDERS } from "./portalRoutes";
import { PortalPagination } from "./PortalPagination";
import { PORTAL_PRIMARY_BTN_CLASS, PortalEmptyState, PortalLoadingBlock } from "./portalUi";

type ShopLocation = {
  id: string;
  locationName: string;
  locationCode: string;
  isPrimary: boolean | null;
};

type ShopProduct = {
  itemId: string;
  itemName: string;
  itemCode: string;
  category: string;
  unitOfMeasure: string;
  imageUrl: string | null;
  unitPrice: string | null;
  availableStock: number | null;
};

type CartLine = { product: ShopProduct; quantity: number };

const SHOP_PAGE_SIZE = 12;

function money(value: string | null | undefined): string {
  const n = Number.parseFloat(value ?? "");
  return Number.isFinite(n) ? n.toFixed(2) : "—";
}

export default function PortalShopPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const [locationId, setLocationId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [cart, setCart] = useState<Map<string, CartLine>>(new Map());
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [locationId, debouncedSearch]);

  const { data: locations = [] } = useQuery<ShopLocation[]>({
    queryKey: ["/api/portal/shop/locations"],
    queryFn: getQueryFn<ShopLocation[]>({ on401: "throw" }),
  });

  useEffect(() => {
    if (!locationId && locations.length > 0) {
      setLocationId(locations.find((l) => l.isPrimary)?.id ?? locations[0].id);
    }
  }, [locations, locationId]);

  const productsUrl = locationId
    ? `/api/portal/shop/products?locationId=${encodeURIComponent(locationId)}${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ""}`
    : null;

  const { data: productsPayload, isLoading: productsLoading } = useQuery<{
    locationId: string;
    products: ShopProduct[];
  }>({
    queryKey: [productsUrl],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!productsUrl,
  });
  const products = productsPayload?.products ?? [];

  const totalPages = Math.max(1, Math.ceil(products.length / SHOP_PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedProducts = useMemo(() => {
    const start = (page - 1) * SHOP_PAGE_SIZE;
    return products.slice(start, start + SHOP_PAGE_SIZE);
  }, [products, page]);

  const cartLines = useMemo(() => [...cart.values()], [cart]);
  const cartTotal = useMemo(
    () =>
      cartLines.reduce((sum, line) => {
        const price = Number.parseFloat(line.product.unitPrice ?? "0");
        return sum + (Number.isFinite(price) ? price * line.quantity : 0);
      }, 0),
    [cartLines],
  );
  const cartCount = cartLines.reduce((sum, line) => sum + line.quantity, 0);

  const setQuantity = (product: ShopProduct, quantity: number) => {
    setCart((prev) => {
      const next = new Map(prev);
      const max = product.availableStock ?? 0;
      const clamped = Math.min(Math.max(quantity, 0), max);
      if (clamped <= 0) next.delete(product.itemId);
      else next.set(product.itemId, { product, quantity: clamped });
      return next;
    });
  };

  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/portal/orders", {
        fulfillmentType: fulfillment,
        locationId: fulfillment === "pickup" ? locationId : null,
        deliveryAddress: fulfillment === "delivery" ? deliveryAddress.trim() : null,
        customerNotes: notes.trim() || null,
        items: cartLines.map((line) => ({ itemId: line.product.itemId, quantity: line.quantity })),
      });
      return res.json() as Promise<{ orderId: string; orderNumber: string }>;
    },
    onSuccess: (data) => {
      toast({
        title: `Order ${data.orderNumber} placed`,
        description: "The business will review your order and keep you updated.",
      });
      setCart(new Map());
      setCheckoutOpen(false);
      setDeliveryAddress("");
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/portal/orders"] });
      navigate(PORTAL_ORDERS);
    },
    onError: (err: Error) => {
      toast({ title: "Could not place order", description: err.message, variant: "destructive" });
    },
  });

  const checkoutDisabled =
    cartLines.length === 0 ||
    placeOrderMutation.isPending ||
    (fulfillment === "delivery" && !deliveryAddress.trim());

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Shop</h2>
          <p className="text-sm text-uventorybiz-gray">
            Browse available products and place an order for pickup or delivery.
          </p>
        </div>
        <Button
          className={PORTAL_PRIMARY_BTN_CLASS}
          disabled={cartLines.length === 0}
          onClick={() => setCheckoutOpen(true)}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Cart ({cartCount}) — {money(String(cartTotal))}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name or code…"
            className="pl-9"
          />
        </div>
        {locations.length > 1 && (
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger className="sm:w-64">
              <SelectValue placeholder="Store location" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.locationName}
                  {loc.isPrimary ? " (main)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {productsLoading ? (
        <PortalLoadingBlock label="Loading products…" />
      ) : products.length === 0 ? (
        <PortalEmptyState
          icon={Package}
          title="No products available"
          description={
            debouncedSearch
              ? "No products match your search at this location."
              : "This location has no products available to order right now."
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pagedProducts.map((product) => {
              const inCart = cart.get(product.itemId);
              return (
                <Card key={product.itemId} className="border-gray-200 shadow-sm flex flex-col">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-start justify-between gap-2">
                      <span className="min-w-0 truncate" title={product.itemName}>
                        {product.itemName}
                      </span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {product.itemCode}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="capitalize">
                      {product.category.replace(/_/g, " ")} · per {product.unitOfMeasure}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{money(product.unitPrice)}</p>
                      <p className="text-xs text-uventorybiz-gray">{product.availableStock} in stock</p>
                    </div>
                    {inCart ? (
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          onClick={() => setQuantity(product, inCart.quantity - 1)}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{inCart.quantity}</span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          disabled={inCart.quantity >= (product.availableStock ?? 0)}
                          onClick={() => setQuantity(product, inCart.quantity + 1)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setQuantity(product, 1)}>
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <PortalPagination
            page={page}
            pageSize={SHOP_PAGE_SIZE}
            total={products.length}
            onPageChange={setPage}
            itemLabel="products"
          />
        </div>
      )}

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Review your order</DialogTitle>
            <DialogDescription>
              Choose pickup or delivery. The business will confirm your order before it is prepared.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border divide-y">
              {cartLines.map((line) => (
                <div key={line.product.itemId} className="flex items-center justify-between gap-2 p-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{line.product.itemName}</p>
                    <p className="text-xs text-uventorybiz-gray">
                      {line.quantity} × {money(line.product.unitPrice)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-medium">
                      {money(String(Number.parseFloat(line.product.unitPrice ?? "0") * line.quantity))}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-red-600"
                      onClick={() => setQuantity(line.product, 0)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between p-2.5 bg-gray-50">
                <span className="text-sm font-semibold">Total</span>
                <span className="text-sm font-semibold">{money(String(cartTotal))}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Fulfillment</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={fulfillment === "pickup" ? "default" : "outline"}
                  className={fulfillment === "pickup" ? PORTAL_PRIMARY_BTN_CLASS : ""}
                  onClick={() => setFulfillment("pickup")}
                >
                  Pickup
                </Button>
                <Button
                  type="button"
                  variant={fulfillment === "delivery" ? "default" : "outline"}
                  className={fulfillment === "delivery" ? PORTAL_PRIMARY_BTN_CLASS : ""}
                  onClick={() => setFulfillment("delivery")}
                >
                  Delivery
                </Button>
              </div>
            </div>

            {fulfillment === "pickup" ? (
              <div className="space-y-2">
                <Label>Pickup location</Label>
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.locationName}
                        {loc.isPrimary ? " (main)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-uventorybiz-gray">
                  Stock availability is based on the selected location.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="delivery-address">Delivery address</Label>
                <Textarea
                  id="delivery-address"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Street, area, landmarks, phone number…"
                  rows={3}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="order-notes">Notes for the business (optional)</Label>
              <Textarea
                id="order-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything the business should know about this order"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>
              Keep shopping
            </Button>
            <Button
              className={PORTAL_PRIMARY_BTN_CLASS}
              disabled={checkoutDisabled}
              onClick={() => placeOrderMutation.mutate()}
            >
              {placeOrderMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Place order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
