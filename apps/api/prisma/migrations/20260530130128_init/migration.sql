-- CreateTable
CREATE TABLE "menu_scans" (
    "id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "ocr_raw_text" TEXT,
    "structured_json" JSONB NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'unknown',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "item_count" INTEGER NOT NULL DEFAULT 0,
    "processing_time_ms" INTEGER,
    "model_used" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_sheets" (
    "id" TEXT NOT NULL,
    "menu_scan_id" TEXT NOT NULL,
    "items_json" JSONB NOT NULL,
    "waiter_text" TEXT NOT NULL,
    "chinese_text" TEXT NOT NULL,
    "total_cny" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_original" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_sheets_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "order_sheets" ADD CONSTRAINT "order_sheets_menu_scan_id_fkey" FOREIGN KEY ("menu_scan_id") REFERENCES "menu_scans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
