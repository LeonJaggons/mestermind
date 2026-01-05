import re
from typing import Tuple, List, Set
import phonenumbers
from phonenumbers import PhoneNumberMatcher
import usaddress


class ContactObfuscator:
    """Sophisticated contact information obfuscation utility"""
    
    # Email patterns
    EMAIL_PATTERNS = [
        r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',  # Standard email
        r'\b[A-Za-z0-9._%+-]+\s*@\s*[A-Za-z0-9.-]+\s*\.\s*[A-Z|a-z]{2,}\b',  # Email with spaces
        r'\b[A-Za-z0-9._%+-]+\s*\[\s*at\s*\]\s*[A-Za-z0-9.-]+\s*\[\s*dot\s*\]\s*[A-Z|a-z]{2,}\b',  # at/dot format
        r'\b[A-Za-z0-9._%+-]+\s+at\s+[A-Za-z0-9.-]+\s+dot\s+[A-Z|a-z]{2,}\b',  # "at" and "dot" words
    ]
    
    # Phone number patterns (US and international formats)
    PHONE_PATTERNS = [
        r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b',  # 123-456-7890 or 123.456.7890 or 123 456 7890
        r'\b\(\d{3}\)\s*\d{3}[-.\s]?\d{4}\b',  # (123) 456-7890
        r'\b\d{3}\s*\d{3}\s*\d{4}\b',  # 1234567890
        r'\b1[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b',  # 1-123-456-7890
        r'[:\s]?\+\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,11}\b',  # International format with optional colon/space prefix
        r'\b\d{3}\s*\d{4}\b',  # 7 digit phone (xxx xxxx)
        r'\b\d{10,15}\b',  # Long sequence of digits (likely phone)
    ]
    
    # URL patterns
    URL_PATTERNS = [
        r'https?://(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&/=]*)',
        r'www\.[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&/=]*)',
    ]
    
    # Social media patterns
    SOCIAL_PATTERNS = [
        r'@[A-Za-z0-9_]{1,15}',  # Twitter/Instagram handles
        r'facebook\.com/[A-Za-z0-9.]+',
        r'instagram\.com/[A-Za-z0-9._]+',
        r'linkedin\.com/in/[A-Za-z0-9-]+',
    ]
    
    # Physical address patterns
    ADDRESS_PATTERNS = [
        # Hungarian addresses (city, street type, street name, house number)
        # Format: Budapest, Andrássy út 1.
        r'\b[A-ZÁÉÍÓÖŐÚÜŰ][a-záéíóöőúüű]+(?:\s+[A-ZÁÉÍÓÖŐÚÜŰ][a-záéíóöőúüű]+)?\s*,\s*[A-ZÁÉÍÓÖŐÚÜŰ][a-záéíóöőúüű]+\s+(?:utca|út|u\.|tér|körút|köz|sétány|fasor|sor|dűlő)\s+\d+\.?',
        # Hungarian with postal code: 1061 Budapest, Andrássy út 1.
        r'\b\d{4}\s+[A-ZÁÉÍÓÖŐÚÜŰ][a-záéíóöőúüű]+(?:\s+[A-ZÁÉÍÓÖŐÚÜŰ][a-záéíóöőúüű]+)?\s*,\s*[A-ZÁÉÍÓÖŐÚÜŰ][a-záéíóöőúüű]+\s+(?:utca|út|u\.|tér|körút|köz|sétány|fasor|sor|dűlő)\s+\d+\.?',
        # Hungarian street only: Andrássy út 1.
        r'\b[A-ZÁÉÍÓÖŐÚÜŰ][a-záéíóöőúüű]+\s+(?:utca|út|u\.|tér|körút|köz|sétány|fasor|sor|dűlő)\s+\d+\.?',
        # Hungarian postal codes (4 digits)
        r'\b\d{4}\s+[A-ZÁÉÍÓÖŐÚÜŰ][a-záéíóöőúüű]+\b',
        
        # US Street addresses with numbers
        r'\b\d+\s+[A-Z][a-z]+\s+(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Boulevard|Blvd\.?|Lane|Ln\.?|Drive|Dr\.?|Court|Ct\.?|Place|Pl\.?|Way|Circle|Cir\.?|Parkway|Pkwy\.?)\b',
        # PO Box
        r'\b(?:P\.?O\.?\s*Box|Post\s+Office\s+Box)\s+\d+\b',
        # Full US address with city, state, zip
        r'\b\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s*,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s*,?\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?\b',
        # US Zip codes (5 or 9 digits)
        r'\b\d{5}(?:-\d{4})?\b',
        # UK Postal codes
        r'\b[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}\b',
        # Canada Postal codes
        r'\b[A-Z]\d[A-Z]\s*\d[A-Z]\d\b',
    ]
    
    # Creative obfuscations people use
    CREATIVE_PATTERNS = [
        (r'\b(\d)\s*(\d)\s*(\d)[-.\s]*(\d)\s*(\d)\s*(\d)[-.\s]*(\d)\s*(\d)\s*(\d)\s*(\d)\b', 'phone'),  # Spaced digits
        (r'\bemail\s*:\s*[^\s]+', 'email_label'),
        (r'\bcontact\s*:\s*[^\s]+', 'contact_label'),
        (r'\bcall\s+me\s+(?:at\s+)?([0-9\-\.\s\(\)]+)', 'call_me'),
        (r'\btext\s+me\s+(?:at\s+)?([0-9\-\.\s\(\)]+)', 'text_me'),
        (r'\breply\s+(?:to\s+)?([^\s]+@[^\s]+)', 'reply_to'),
        (r'\b(?:my\s+)?address\s+is\s+[^\n\.]+', 'address_label'),
        (r'\b(?:visit|come\s+to|located\s+at)\s+\d+\s+[^\n\.]+', 'location'),
    ]
    
    @classmethod
    def _detect_phone_numbers_advanced(cls, text: str) -> List[tuple]:
        """Use Google's phonenumbers library for accurate phone detection"""
        matches = []
        
        # Try multiple regions for international coverage
        regions = ['US', 'GB', 'CA', 'AU', 'HU', 'ZZ']  # ZZ is for international numbers
        
        for region in regions:
            try:
                for match in PhoneNumberMatcher(text, region):
                    # Add to matches with position
                    matches.append((match.start, match.end, match.raw_string))
            except Exception:
                continue
        
        # Remove duplicates (same position)
        unique_matches = []
        seen_positions: Set[tuple] = set()
        
        for start, end, raw in matches:
            pos = (start, end)
            if pos not in seen_positions:
                seen_positions.add(pos)
                unique_matches.append((start, end, raw))
        
        # Sort by start position
        unique_matches.sort(key=lambda x: x[0])
        return unique_matches
    
    @classmethod
    def _detect_addresses_advanced(cls, text: str, phone_positions: List[tuple] = None) -> List[tuple]:
        """Use usaddress library for ML-based US address detection + Hungarian regex
        
        Args:
            text: The text to search for addresses
            phone_positions: List of (start, end) tuples where phone numbers were found
        """
        matches = []
        phone_positions = phone_positions or []
        
        # First, detect Hungarian addresses using regex (since usaddress is US-only)
        for pattern in cls.ADDRESS_PATTERNS[:4]:  # First 4 patterns are Hungarian
            for match in re.finditer(pattern, text):
                start, end = match.start(), match.end()
                # Check if this match overlaps with existing matches
                overlaps = any(
                    (m[0] <= start < m[1]) or (m[0] < end <= m[1]) or 
                    (start <= m[0] < end) or (start < m[1] <= end)
                    for m in matches
                )
                # If overlaps, keep the longer match
                if overlaps:
                    # Remove overlapping shorter matches
                    matches = [m for m in matches if not (
                        (m[0] <= start < m[1]) or (m[0] < end <= m[1]) or 
                        (start <= m[0] < end) or (start < m[1] <= end)
                    ) or (m[1] - m[0]) >= (end - start)]
                    # Only add if this is longer
                    if not any((m[0] <= start < m[1]) or (m[0] < end <= m[1]) or 
                              (start <= m[0] < end) or (start < m[1] <= end) for m in matches):
                        matches.append((start, end, match.group()))
                else:
                    matches.append((start, end, match.group()))
        
        # Create a cleaned version of text with phone numbers masked to avoid confusion
        text_cleaned = text
        offset = 0
        for start, end in sorted(phone_positions):
            # Replace phone with placeholder that won't be mistaken for address
            placeholder = 'XXXPHONEXXX'
            actual_start = start + offset
            actual_end = end + offset
            text_cleaned = text_cleaned[:actual_start] + placeholder + text_cleaned[actual_end:]
            offset += len(placeholder) - (end - start)
        
        # Then use usaddress ML model for US addresses on cleaned text
        # Split text into sentences/segments to parse
        segments = re.split(r'[.!?\n]', text_cleaned)
        current_pos = 0
        
        for segment in segments:
            if not segment.strip():
                current_pos += len(segment) + 1
                continue
                
            segment_stripped = segment.strip()
            
            try:
                # Try to parse as address using usaddress ML model
                parsed, address_type = usaddress.tag(segment_stripped)
                
                # Be strict: require multiple address components (not just one)
                # Valid address needs AddressNumber AND StreetName AND street type
                has_address_number = 'AddressNumber' in parsed
                has_street_name = 'StreetName' in parsed
                has_street_type = 'StreetNamePostType' in parsed or 'StreetNamePreType' in parsed
                
                # Must have at least address number + street name + type for US addresses
                has_complete_street = has_address_number and has_street_name and has_street_type
                
                # Also check for PO Box (needs both type and ID)
                has_pobox = 'USPSBoxType' in parsed and 'USPSBoxID' in parsed
                
                # Only accept if we have a complete address or PO Box
                # AND the parsed address type is valid
                is_valid_address = (has_complete_street or has_pobox) and address_type in ['Street Address', 'PO Box']
                
                if is_valid_address:
                    # Find the position in original text
                    start_pos = text.find(segment_stripped, current_pos)
                    if start_pos != -1:
                        end_pos = start_pos + len(segment_stripped)
                        # Check if not already matched by Hungarian patterns
                        overlaps = any(m[0] <= start_pos < m[1] or m[0] < end_pos <= m[1] 
                                      for m in matches)
                        if not overlaps:
                            matches.append((start_pos, end_pos, segment_stripped))
                        
            except (usaddress.RepeatedLabelError, Exception):
                # If parsing fails, it's likely not an address
                pass
            
            current_pos += len(segment) + 1
        
        # Remove duplicates and sort
        unique_matches = []
        seen_positions: Set[tuple] = set()
        
        for start, end, raw in matches:
            pos = (start, end)
            if pos not in seen_positions:
                seen_positions.add(pos)
                unique_matches.append((start, end, raw))
        
        unique_matches.sort(key=lambda x: x[0])
        return unique_matches
    
    @classmethod
    def _obfuscate_with_regex(cls, text: str) -> Tuple[str, bool]:
        """Fallback regex-based obfuscation"""
        obfuscated = text
        found_contact_info = False
        
        # Obfuscate emails
        for pattern in cls.EMAIL_PATTERNS:
            matches = re.finditer(pattern, obfuscated, re.IGNORECASE)
            for match in matches:
                found_contact_info = True
                obfuscated = obfuscated.replace(match.group(), '[email removed]')
        
        # Obfuscate phone numbers
        for pattern in cls.PHONE_PATTERNS:
            matches = re.finditer(pattern, obfuscated)
            for match in matches:
                found_contact_info = True
                obfuscated = obfuscated.replace(match.group(), '[phone removed]')
        
        # Obfuscate URLs
        for pattern in cls.URL_PATTERNS:
            matches = re.finditer(pattern, obfuscated, re.IGNORECASE)
            for match in matches:
                found_contact_info = True
                obfuscated = obfuscated.replace(match.group(), '[link removed]')
        
        # Obfuscate social media
        for pattern in cls.SOCIAL_PATTERNS:
            matches = re.finditer(pattern, obfuscated, re.IGNORECASE)
            for match in matches:
                found_contact_info = True
                obfuscated = obfuscated.replace(match.group(), '[social media removed]')
        
        # Handle creative obfuscations
        for pattern, ptype in cls.CREATIVE_PATTERNS:
            matches = re.finditer(pattern, obfuscated, re.IGNORECASE)
            for match in matches:
                found_contact_info = True
                if ptype in ['phone', 'call_me', 'text_me']:
                    obfuscated = obfuscated.replace(match.group(), '[phone removed]')
                elif ptype in ['email_label', 'contact_label', 'reply_to']:
                    obfuscated = obfuscated.replace(match.group(), '[contact info removed]')
        
        return obfuscated, found_contact_info
    
    @classmethod
    def obfuscate(cls, text: str) -> Tuple[str, bool]:
        """
        Obfuscate contact information in text using advanced phone detection.
        
        Returns:
            Tuple of (obfuscated_text, contains_contact_info)
        """
        obfuscated = text
        found_contact_info = False
        
        # First, use Google's phonenumbers library for accurate phone detection
        phone_matches = cls._detect_phone_numbers_advanced(text)
        
        # Get phone positions before obfuscation
        phone_positions = [(start, end) for start, end, _ in phone_matches]
        
        # Use usaddress library for ML-based address detection BEFORE obfuscating phones
        # Pass phone positions so address detection can avoid them
        address_matches = cls._detect_addresses_advanced(text, phone_positions)
        
        # Combine all matches and sort by position (reverse order for replacement)
        all_matches = []
        for start, end, raw in phone_matches:
            all_matches.append((start, end, '[phone removed]'))
        for start, end, raw in address_matches:
            all_matches.append((start, end, '[address removed]'))
        
        # Sort in reverse order to maintain string indices during replacement
        all_matches.sort(key=lambda x: x[0], reverse=True)
        
        # Replace all PII in one pass
        for start, end, replacement in all_matches:
            found_contact_info = True
            obfuscated = obfuscated[:start] + replacement + obfuscated[end:]
        
        # Then apply regex-based detection for emails, URLs, and other patterns
        # Obfuscate emails
        for pattern in cls.EMAIL_PATTERNS:
            matches = list(re.finditer(pattern, obfuscated, re.IGNORECASE))
            for match in reversed(matches):
                found_contact_info = True
                obfuscated = obfuscated[:match.start()] + '[email removed]' + obfuscated[match.end():]
        
        # Obfuscate URLs
        for pattern in cls.URL_PATTERNS:
            matches = list(re.finditer(pattern, obfuscated, re.IGNORECASE))
            for match in reversed(matches):
                found_contact_info = True
                obfuscated = obfuscated[:match.start()] + '[link removed]' + obfuscated[match.end():]
        
        # Obfuscate social media
        for pattern in cls.SOCIAL_PATTERNS:
            matches = list(re.finditer(pattern, obfuscated, re.IGNORECASE))
            for match in reversed(matches):
                found_contact_info = True
                obfuscated = obfuscated[:match.start()] + '[social media removed]' + obfuscated[match.end():]
        
        # Handle creative obfuscations
        for pattern, ptype in cls.CREATIVE_PATTERNS:
            matches = list(re.finditer(pattern, obfuscated, re.IGNORECASE))
            for match in reversed(matches):
                found_contact_info = True
                if ptype in ['phone', 'call_me', 'text_me']:
                    obfuscated = obfuscated[:match.start()] + '[phone removed]' + obfuscated[match.end():]
                elif ptype in ['email_label', 'contact_label', 'reply_to']:
                    obfuscated = obfuscated[:match.start()] + '[contact info removed]' + obfuscated[match.end():]
                elif ptype in ['address_label', 'location']:
                    obfuscated = obfuscated[:match.start()] + '[address removed]' + obfuscated[match.end():]
        
        return obfuscated, found_contact_info
    
    @classmethod
    def validate_message(cls, text: str) -> Tuple[bool, str]:
        """
        Validate if a message contains contact information.
        
        Returns:
            Tuple of (is_valid, error_message)
        """
        _, contains_contact = cls.obfuscate(text)
        
        if contains_contact:
            return False, "Your message contains contact information. Please use Mestermind's messaging system to communicate."
        
        return True, ""
