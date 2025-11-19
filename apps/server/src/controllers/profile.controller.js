import supabase from "../lib/supabaseAdmin.js";

export const getProfile = async (req, res) => {
  const userId = req.user.id;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) return res.status(400).json({ error });

  res.json(data);
};

export const updateProfile = async (req, res) => {
  const userId = req.user.id;
  const { first_name, last_name, location, description } = req.body;

  const { error } = await supabase
    .from("users")
    .update({
      first_name,
      last_name,
      location,
      description,
    })
    .eq("id", userId);

  if (error) return res.status(400).json({ error });
  res.json({ success: true });
};
