from ml.rag_service import AgriScheduler
import os

def test():
    try:
        scheduler = AgriScheduler()
        result = scheduler.get_schedule("papaya", "General Purpose Fertilizer")
        with open("rag_test_output.txt", "w", encoding="utf-8") as f:
            f.write(result)
        print("✅ Response written to rag_test_output.txt")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test()
