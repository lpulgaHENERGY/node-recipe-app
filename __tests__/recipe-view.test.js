const fs = require('fs');
const path = require('path');

describe('Recipe view template', () => {
  test('should include delete forms in both view and edit sections', () => {
    const templatePath = path.join(__dirname, '..', 'views', 'recipe.hbs');
    const template = fs.readFileSync(templatePath, 'utf8');

    const deleteFormAction = 'action="/recipes/{{recipe.id}}/delete"';
    const deleteFormCount = (template.match(new RegExp(deleteFormAction, 'g')) || []).length;

    expect(deleteFormCount).toBe(2);
    expect(template).toContain('Delete Recipe');
  });
});
