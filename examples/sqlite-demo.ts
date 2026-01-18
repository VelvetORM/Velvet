import { Database, Model, Schema } from "../packages/core/src/index";

class User extends Model {
  static table = "users";

  posts() {
    return this.hasMany(Post, "user_id");
  }
}

class Post extends Model {
  static table = "posts";

  author() {
    return this.belongsTo(User, "user_id");
  }
}

async function main(): Promise<void> {
  // Connect to SQLite (in-memory for demo)
  await Database.connect({
    client: "sqlite",
    connection: {
      filename: ":memory:",
      memory: true,
    },
  });

  // Create schema
  await Schema.create("users", (table) => {
    table.increments("id");
    table.string("name");
    table.boolean("active").default(1);
    table.timestamps();
  });

  await Schema.create("posts", (table) => {
    table.increments("id");
    table.string("title");
    table.integer("user_id");
    table.timestamps();
  });

  // Seed data
  const alice = await User.create({ name: "Alice", active: true });
  const bob = await User.create({ name: "Bob", active: false });

  await Post.create({
    title: "Hello World",
    user_id: alice.getAttribute("id"),
  });
  await Post.create({
    title: "Second Post",
    user_id: alice.getAttribute("id"),
  });
  await Post.create({ title: "Bob Post", user_id: bob.getAttribute("id") });

  // Basic query
  const activeUsers = await User.where("active", true).orderBy("name").get();
  console.log(
    "Active users:",
    activeUsers.map((u) => u.toJSON()),
  );

  // Eager loading
  const usersWithPosts = await User.with("posts").orderBy("id").get();
  for (const user of usersWithPosts) {
    const posts = user.getRelation("posts") as Post[] | undefined;
    console.log(
      user.getAttribute("name"),
      "posts:",
      posts?.map((p) => p.getAttribute("title")),
    );
  }

  await Database.disconnectAll();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
