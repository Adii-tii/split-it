Design the Django backend using a feature-based architecture.

Project structure:

apps/
├── users/
├── groups/
├── expenses/
├── settlements/
└── notifications/

Inside each app:

- models/: Django ORM models
- views/: DRF API views/viewsets
- serializers/: request/response serializers
- services/: business logic and write operations
- selectors/: read/query operations
- urls.py: app routes
- admin.py: Django admin registration

Architecture rules:

1. Views must remain thin.
2. Business logic belongs in services.
3. Database read/query logic belongs in selectors.
4. Models should contain only schema definitions and minimal domain methods.
5. Serializers handle validation and data transformation.
6. Views call services/selectors and return DRF responses.
7. Follow SOLID principles and separation of concerns.
8. Use Django REST Framework.
9. Use PostgreSQL as the database.
10. Use JWT authentication.
11. Write production-ready, scalable code.
12. Prefer function-based services/selectors over unnecessary classes.
13. Include proper error handling and type hints.