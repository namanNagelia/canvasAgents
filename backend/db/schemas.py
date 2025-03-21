from sqlalchemy import create_engine, Column, String
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.dialects.postgresql import UUID
import os
import dotenv
import uuid

dotenv.load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
print(DATABASE_URL)

engine = create_engine(DATABASE_URL)

Base = declarative_base()

# To PUSH: alembic revision --autogenerate -m "Added role column to users" && alembic upgrade head


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)


Session = sessionmaker(bind=engine)
session = Session()

Base.metadata.create_all(engine)

print("Database schema created successfully!")
