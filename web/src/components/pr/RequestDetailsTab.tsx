import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  PurchaseRequest,
  calculateItemTotalCents,
  calculateEstimatedCostCents,
} from "@/models/pr";
import { Department } from "@/models/departments";

interface RequestDetailsTabProps {
  purchaseRequest: Partial<PurchaseRequest>;
  department?: Department;
  isLoading: boolean;
}

export function RequestDetailsTab({
  purchaseRequest,
  department,
  isLoading,
}: RequestDetailsTabProps) {
  return (
    <div className="mx-12 mx-4 my-10 flex justify-start rounded-lg border bg-background p-8 pl-24">
      {isLoading ? (
        <></>
      ) : (
        <div className="w-full space-y-8">
          <div className="grid grid-cols-1 gap-y-10 lg:grid-cols-2">
            <div>
              <p className="mb-2 font-medium text-gray-400">Requester</p>
              <div className="flex items-center pl-8">
                <Avatar className="mr-4 h-12 w-12">
                  <AvatarImage src={purchaseRequest.user?.avatar_url} />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start justify-center">
                  <div>
                    {purchaseRequest.user?.first_name}{" "}
                    {purchaseRequest.user?.last_name}
                  </div>
                  <div className="text-gray-400">
                    {purchaseRequest.user?.email}
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="grid grid-cols-1 pt-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-[auto_1fr] xl:gap-x-24">
                <p className="font-medium text-gray-400">ID #</p>
                <p>{purchaseRequest.id}</p>
                <p className="font-medium text-gray-400">Date Requested</p>
                <p>
                  {purchaseRequest.created_at
                    ? new Date(purchaseRequest.created_at).toLocaleDateString()
                    : ""}
                </p>
                <p className="font-medium text-gray-400">Status</p>
                <p>{purchaseRequest.status}</p>
              </div>
            </div>
          </div>
          <div className="mb-20">
            <div className="grid grid-cols-1 gap-y-10 lg:grid-cols-2 lg:items-start">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 lg:gap-x-24 xl:grid-cols-[auto_1fr]">
                <p className="font-medium text-gray-400">Subteam </p>
                <p>{department?.name}</p>
                <p className="font-medium text-gray-400">Component </p>
                <p>{purchaseRequest.component}</p>
                <p className="font-medium text-gray-400">Vendor </p>
                <p>{purchaseRequest.vendor}</p>
                <p className="font-medium text-gray-400">Priority </p>
                <p>{purchaseRequest.priority}</p>
                <p className="font-medium text-gray-400">Needed By </p>
                <p>
                  {purchaseRequest.needed_by_date
                    ? new Date(
                        purchaseRequest.needed_by_date,
                      ).toLocaleDateString()
                    : ""}
                </p>
                <p className="font-medium text-gray-400">Description </p>
                <p className="max-h-32 break-all pr-4">
                  {purchaseRequest.description}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 lg:gap-x-10 xl:grid-cols-[auto_1fr]">
                <p className="font-medium text-gray-400">
                  Estimated Item Total{" "}
                </p>
                <p>
                  $
                  {purchaseRequest.items
                    ? (
                        calculateEstimatedCostCents(purchaseRequest.items) / 100
                      ).toFixed(2)
                    : "0.00"}
                </p>
                <p className="font-medium text-gray-400">
                  Estimated Shipping/Tax{" "}
                </p>
                <p>
                  $
                  {purchaseRequest.shipping_tax_cost_cents
                    ? (purchaseRequest.shipping_tax_cost_cents / 100).toFixed(2)
                    : "0.00"}
                </p>
                <p className="font-medium text-gray-400">Estimated Cost </p>
                <p>
                  $
                  {purchaseRequest.estimated_cost_cents
                    ? (purchaseRequest.estimated_cost_cents / 100).toFixed(2)
                    : "0.00"}
                </p>
                <p className="font-medium text-gray-400">Who will order?</p>
                <p>{purchaseRequest.requested_purchaser}</p>
                <p className="font-medium text-gray-400">Final Price </p>
                <p>
                  {purchaseRequest.final_cost_cents &&
                  purchaseRequest.final_cost_cents > 0
                    ? `$${(purchaseRequest.final_cost_cents / 100).toFixed(2)}`
                    : ""}
                </p>
                <p className="font-medium text-gray-400">Requested Address</p>
                <p className="max-h-32 overflow-y-auto">
                  {purchaseRequest.shipping_address?.name
                    ? `${purchaseRequest.shipping_address.name} - ${purchaseRequest.shipping_address.street_address}, ${purchaseRequest.shipping_address.city}, ${purchaseRequest.shipping_address.state} ${purchaseRequest.shipping_address.zip_code}`
                    : ""}
                </p>
                <p className="font-medium text-gray-400">Placed w/o approval?</p>
                <p>{purchaseRequest.placed_order_unapproved ? "Yes" : "No"}</p>
              </div>
            </div>
          </div>
          <div>
            <p className="mb-2 mt-20 font-medium text-gray-400">
              Items ({purchaseRequest.items?.length || 0})
            </p>
            <div className="grid grid-cols-1 gap-4 pb-2 sm:grid-cols-[1fr_8fr_4fr_4fr_4fr_10fr]">
              <p className="text-sm font-medium text-gray-400"> </p>
              <p className="text-sm font-medium text-gray-400"> Item Name </p>
              <p className="text-sm font-medium text-gray-400"> Unit Price </p>
              <p className="text-sm font-medium text-gray-400"> Quantity </p>
              <p className="text-sm font-medium text-gray-400"> Item Total </p>
              <p className="text-sm font-medium text-gray-400"> URL </p>
            </div>
            {purchaseRequest.items && purchaseRequest.items.length > 0 ? (
              <div className="space-y-4">
                {purchaseRequest.items.map((item, index) => (
                  <div key={item.id || index}>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_8fr_4fr_4fr_4fr_10fr]">
                      <p className="text-sm font-medium text-gray-400">
                        #{index + 1}
                      </p>

                      <p className="overflow-y-scroll break-all text-sm">
                        {item.name || "N/A"}
                      </p>

                      <p className="text-sm">
                        ${((item.unit_price_cents || 0) / 100).toFixed(2)}
                      </p>

                      <p className="text-sm">{item.quantity || 0}</p>

                      <p className="text-sm">
                        ${(calculateItemTotalCents(item) / 100).toFixed(2)}
                      </p>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-sm text-blue-400 underline"
                      >
                        {item.url}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                <p>No items found for this purchase request.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
