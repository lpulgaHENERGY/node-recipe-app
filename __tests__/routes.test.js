const request = require('supertest');
const express = require('express');
const routes = require('../src/routes');
const { initializeTestDb } = require('./test-database');

// Mock the database module to use test database
jest.mock('../src/database', () => ({
  getDbConnection: () => require('./test-database').getTestDbConnection()
}));

// Simple app setup for testing
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Simple mock for res.render
  app.use((req, res, next) => {
    res.render = (view, locals) => res.json({ view, locals });
    next();
  });
  
  app.use('/', routes);
  return app;
}

describe('Routes', () => {
  let app;
  let db;

  beforeEach(async () => {
    app = createTestApp();
    db = await initializeTestDb();
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  test('GET / should return 200', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.body.view).toBe('home');
  });

  test('POST /recipes should create a new recipe', async () => {
    const newRecipe = {
      title: 'New Test Recipe',
      ingredients: 'New test ingredients',
      method: 'New test method'
    };

    const response = await request(app)
      .post('/recipes')
      .send(newRecipe);

    expect(response.status).toBe(302); // Redirect status
    expect(response.headers.location).toBe('/recipes');

    // Verify recipe was created
    const recipe = await db.get('SELECT * FROM recipes WHERE title = ?', [newRecipe.title]);
    expect(recipe).toBeDefined();
    expect(recipe.title).toBe(newRecipe.title);
  });

  test('POST /recipes/:id/delete should delete a recipe', async () => {
    const createResult = await db.run(
      'INSERT INTO recipes (title, ingredients, method) VALUES (?, ?, ?)',
      ['Recipe To Delete', 'Ingredient 1', 'Step 1']
    );

    const response = await request(app).post(`/recipes/${createResult.lastID}/delete`);

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/recipes');

    const deletedRecipe = await db.get('SELECT * FROM recipes WHERE id = ?', [createResult.lastID]);
    expect(deletedRecipe).toBeUndefined();
  });

  test('POST /recipes/:id/delete should keep other recipes', async () => {
    const firstRecipe = await db.run(
      'INSERT INTO recipes (title, ingredients, method) VALUES (?, ?, ?)',
      ['Delete Me', 'Ingredient A', 'Step A']
    );
    const secondRecipe = await db.run(
      'INSERT INTO recipes (title, ingredients, method) VALUES (?, ?, ?)',
      ['Keep Me', 'Ingredient B', 'Step B']
    );

    await request(app).post(`/recipes/${firstRecipe.lastID}/delete`);

    const remainingRecipe = await db.get('SELECT * FROM recipes WHERE id = ?', [secondRecipe.lastID]);
    expect(remainingRecipe).toBeDefined();
    expect(remainingRecipe.title).toBe('Keep Me');
  });
});