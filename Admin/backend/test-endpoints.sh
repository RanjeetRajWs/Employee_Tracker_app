#!/bin/bash

# Test Script for New Endpoints
# Run this script to test all newly implemented endpoints

echo "🧪 Testing Admin Backend - New Endpoints"
echo "=========================================="
echo ""

BASE_URL="http://localhost:5000/admin"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "${YELLOW}1. Testing Health Check${NC}"
curl -s "$BASE_URL/../health" | jq '.'
echo ""

echo "${YELLOW}2. Testing Settings Endpoint (should work without auth now)${NC}"
curl -s "$BASE_URL/settings" | jq '.'
echo ""

echo "${YELLOW}3. Creating a test user${NC}"
# First, we need to login as admin to create a user
# You'll need to replace these credentials with actual admin credentials
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="Admin123!"

echo "Logging in as admin..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')

if [ "$TOKEN" != "null" ] && [ ! -z "$TOKEN" ]; then
  echo "${GREEN}✓ Admin login successful${NC}"
  
  echo ""
  echo "${YELLOW}Creating test employee user...${NC}"
  CREATE_USER_RESPONSE=$(curl -s -X POST "$BASE_URL/users" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
      "username": "testemployee",
      "email": "employee@test.com",
      "password": "TempPass123",
      "role": "user"
    }')
  
  echo $CREATE_USER_RESPONSE | jq '.'
  
  USER_ID=$(echo $CREATE_USER_RESPONSE | jq -r '.user.id')
  
  if [ "$USER_ID" != "null" ] && [ ! -z "$USER_ID" ]; then
    echo "${GREEN}✓ Test user created successfully${NC}"
    echo "User ID: $USER_ID"
    
    echo ""
    echo "${YELLOW}4. Testing User Authentication Endpoint${NC}"
    AUTH_RESPONSE=$(curl -s -X POST "$BASE_URL/users/authenticate" \
      -H "Content-Type: application/json" \
      -d '{
        "email": "employee@test.com",
        "password": "TempPass123"
      }')
    
    echo $AUTH_RESPONSE | jq '.'
    
    if echo $AUTH_RESPONSE | jq -e '.success' > /dev/null; then
      echo "${GREEN}✓ User authentication successful${NC}"
    else
      echo "${RED}✗ User authentication failed${NC}"
    fi
    
    echo ""
    echo "${YELLOW}5. Testing User Status Check Endpoint${NC}"
    STATUS_RESPONSE=$(curl -s "$BASE_URL/users/status/$USER_ID")
    echo $STATUS_RESPONSE | jq '.'
    
    if echo $STATUS_RESPONSE | jq -e '.success' > /dev/null; then
      echo "${GREEN}✓ User status check successful${NC}"
    else
      echo "${RED}✗ User status check failed${NC}"
    fi
    
    echo ""
    echo "${YELLOW}6. Testing Password Change Endpoint${NC}"
    PASSWORD_CHANGE_RESPONSE=$(curl -s -X PUT "$BASE_URL/users/change-password" \
      -H "Content-Type: application/json" \
      -d "{
        \"userId\": \"$USER_ID\",
        \"oldPassword\": \"TempPass123\",
        \"newPassword\": \"NewPass456\"
      }")
    
    echo $PASSWORD_CHANGE_RESPONSE | jq '.'
    
    if echo $PASSWORD_CHANGE_RESPONSE | jq -e '.success' > /dev/null; then
      echo "${GREEN}✓ Password change successful${NC}"
    else
      echo "${RED}✗ Password change failed${NC}"
    fi
    
    echo ""
    echo "${YELLOW}7. Testing Session Upload Endpoint${NC}"
    SESSION_RESPONSE=$(curl -s -X POST "$BASE_URL/sessions/upload" \
      -H "Content-Type: application/json" \
      -d "{
        \"userId\": \"$USER_ID\",
        \"workingTime\": 3600000,
        \"idleTime\": 300000,
        \"sessionStart\": $(date +%s)000,
        \"sessionEnd\": $(date +%s)000,
        \"date\": \"$(date +%Y-%m-%d)\",
        \"timestamp\": $(date +%s)000,
        \"screenshotCount\": 5,
        \"breaksTaken\": 1,
        \"screenshots\": [],
        \"breakDetails\": []
      }")
    
    echo $SESSION_RESPONSE | jq '.'
    
    if echo $SESSION_RESPONSE | jq -e '.success' > /dev/null; then
      echo "${GREEN}✓ Session upload successful${NC}"
    else
      echo "${RED}✗ Session upload failed${NC}"
    fi
    
    echo ""
    echo "${YELLOW}8. Testing Activity Logs${NC}"
    ACTIVITY_RESPONSE=$(curl -s "$BASE_URL/activity-logs" \
      -H "Authorization: Bearer $TOKEN")
    
    echo $ACTIVITY_RESPONSE | jq '.'
    
  else
    echo "${RED}✗ Failed to create test user${NC}"
  fi
  
else
  echo "${RED}✗ Admin login failed. Please create an admin user first.${NC}"
  echo "Run this command to create an admin:"
  echo "curl -X POST $BASE_URL/register -H 'Content-Type: application/json' -d '{\"username\":\"admin\",\"email\":\"admin@example.com\",\"password\":\"Admin123!\",\"role\":\"superadmin\"}'"
fi

echo ""
echo "=========================================="
echo "🏁 Testing Complete!"
echo "=========================================="
