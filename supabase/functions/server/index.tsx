import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-3d6cf358/health", (c) => {
  return c.json({ status: "ok" });
});

// Auth: Sign up endpoint
app.post("/make-server-3d6cf358/auth/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name: name || '' },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log(`Sign up error: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ 
      user: { 
        id: data.user.id, 
        email: data.user.email,
        name: data.user.user_metadata?.name 
      } 
    });
  } catch (error) {
    console.log(`Sign up exception: ${error}`);
    return c.json({ error: "Failed to create user" }, 500);
  }
});

// Auth: Check if email exists
app.post("/make-server-3d6cf358/auth/check-email", async (c) => {
  try {
    const { email } = await c.req.json();
    
    if (!email) {
      return c.json({ error: "Email is required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // List users with this email using the admin API
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.log(`Check email error: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    // Check if any user has this email
    const userExists = data.users.some(user => user.email === email);

    return c.json({ exists: userExists });
  } catch (error) {
    console.log(`Check email exception: ${error}`);
    return c.json({ error: "Failed to check email" }, 500);
  }
});

// Auth: Get current session endpoint
app.get("/make-server-3d6cf358/auth/session", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ user: null });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return c.json({ user: null });
    }

    return c.json({ 
      user: { 
        id: user.id, 
        email: user.email,
        name: user.user_metadata?.name 
      } 
    });
  } catch (error) {
    console.log(`Session check exception: ${error}`);
    return c.json({ user: null });
  }
});

// User data: Get user's workouts
app.get("/make-server-3d6cf358/user/workouts", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      console.log('Get workouts: No access token provided');
      return c.json({ error: "Unauthorized - No access token" }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error) {
      console.log(`Get workouts: Auth error - ${error.message}`);
      return c.json({ error: `Unauthorized - ${error.message}` }, 401);
    }

    if (!user) {
      console.log('Get workouts: No user found');
      return c.json({ error: "Unauthorized - Invalid token" }, 401);
    }

    const workouts = await kv.getByPrefix(`user:${user.id}:workouts:`);
    return c.json({ workouts: workouts.map(w => w.value) });
  } catch (error) {
    console.log(`Get workouts error: ${error}`);
    return c.json({ error: "Failed to fetch workouts" }, 500);
  }
});

// User data: Save workout
app.post("/make-server-3d6cf358/user/workouts", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      console.log('Save workout: No access token provided');
      return c.json({ code: 401, message: "Unauthorized - No access token" }, 401);
    }

    console.log('Save workout: Validating access token...');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error) {
      console.log(`Save workout: Auth error - ${error.message}`);
      return c.json({ code: 401, message: `Invalid JWT - ${error.message}` }, 401);
    }

    if (!user) {
      console.log('Save workout: No user found for token');
      return c.json({ code: 401, message: "Invalid JWT - No user found" }, 401);
    }

    console.log(`Save workout: User authenticated - ${user.id}`);
    const { workout } = await c.req.json();
    
    if (!workout || !workout.id) {
      console.log('Save workout: Invalid workout data');
      return c.json({ code: 400, message: "Invalid workout data" }, 400);
    }

    console.log(`Save workout: Saving workout ${workout.id} for user ${user.id}`);
    await kv.set(`user:${user.id}:workouts:${workout.id}`, workout);
    console.log(`Save workout: Successfully saved workout ${workout.id}`);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Save workout error: ${error}`);
    return c.json({ code: 500, message: "Failed to save workout" }, 500);
  }
});

// User data: Delete workouts
app.delete("/make-server-3d6cf358/user/workouts", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { workoutIds } = await c.req.json();
    
    if (!workoutIds || !Array.isArray(workoutIds)) {
      return c.json({ error: "Invalid workout IDs" }, 400);
    }

    const keys = workoutIds.map(id => `user:${user.id}:workouts:${id}`);
    await kv.mdel(keys);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Delete workouts error: ${error}`);
    return c.json({ error: "Failed to delete workouts" }, 500);
  }
});

// User data: Get user's templates
app.get("/make-server-3d6cf358/user/templates", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const templates = await kv.getByPrefix(`user:${user.id}:templates:`);
    return c.json({ templates: templates.map(t => t.value) });
  } catch (error) {
    console.log(`Get templates error: ${error}`);
    return c.json({ error: "Failed to fetch templates" }, 500);
  }
});

// User data: Save template
app.post("/make-server-3d6cf358/user/templates", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { template } = await c.req.json();
    
    if (!template || !template.id) {
      return c.json({ error: "Invalid template data" }, 400);
    }

    await kv.set(`user:${user.id}:templates:${template.id}`, template);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Save template error: ${error}`);
    return c.json({ error: "Failed to save template" }, 500);
  }
});

// User data: Delete template
app.delete("/make-server-3d6cf358/user/templates/:templateId", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const templateId = c.req.param('templateId');
    await kv.del(`user:${user.id}:templates:${templateId}`);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Delete template error: ${error}`);
    return c.json({ error: "Failed to delete template" }, 500);
  }
});

Deno.serve(app.fetch);