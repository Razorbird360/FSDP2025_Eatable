-- CreateTable
CREATE TABLE "menu_item_likes" (
    "user_id" UUID NOT NULL,
    "menu_item_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_item_likes_pkey" PRIMARY KEY ("user_id","menu_item_id")
);

-- AddForeignKey
ALTER TABLE "menu_item_likes" ADD CONSTRAINT "menu_item_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_likes" ADD CONSTRAINT "menu_item_likes_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
