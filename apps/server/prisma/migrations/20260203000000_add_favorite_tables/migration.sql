-- CreateTable
CREATE TABLE "favorite_stalls" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "stall_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_stalls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorite_dishes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "menu_item_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_dishes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "favorite_stalls_user_id_stall_id_key" ON "favorite_stalls"("user_id", "stall_id");

-- CreateIndex
CREATE UNIQUE INDEX "favorite_dishes_user_id_menu_item_id_key" ON "favorite_dishes"("user_id", "menu_item_id");

-- AddForeignKey
ALTER TABLE "favorite_stalls" ADD CONSTRAINT "favorite_stalls_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_stalls" ADD CONSTRAINT "favorite_stalls_stall_id_fkey" FOREIGN KEY ("stall_id") REFERENCES "stalls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_dishes" ADD CONSTRAINT "favorite_dishes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_dishes" ADD CONSTRAINT "favorite_dishes_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
