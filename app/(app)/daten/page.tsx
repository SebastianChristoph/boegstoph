import DataTab from "@/components/daten/DataTab"

export default function DatenPage() {
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Daten</h1>
        <p className="text-gray-500 mt-1">Temperatur & Luftfeuchtigkeit</p>
      </div>
      <DataTab />
    </div>
  )
}
