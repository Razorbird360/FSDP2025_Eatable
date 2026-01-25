-- CreateTable
CREATE TABLE "stall_likes" (
    "user_id" UUID NOT NULL,
    "stall_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stall_likes_pkey" PRIMARY KEY ("user_id","stall_id")
);

-- AddForeignKey
ALTER TABLE "stall_likes" ADD CONSTRAINT "stall_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stall_likes" ADD CONSTRAINT "stall_likes_stall_id_fkey" FOREIGN KEY ("stall_id") REFERENCES "stalls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
