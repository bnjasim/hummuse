import re

months ={'Jan':1, 'Feb':2, 'Mar':3, 'Apr':4, 'May':5, 'Jun':6,
				'Jul':7, 'Aug':8, 'Sep':9, 'Oct':10, 'Nov':11, 'Dec':12}
	
def get_prev_date(curr_date):
	# returns day and month of minus days before curr_date
	#curr_date (day, month, year) format
	day, month, year = curr_date
	if day>1:
		return (day-1, month, year)

	if day==1 and month>1:
		if month in [2, 4, 6, 8, 9, 11]:
			return (31, month-1, year)

		if month == 3:
			if 	year%4 == 0:
				return (29, 2, year)
			else:
				return (28, 2, year)

		else:
			return (30, month-1, year)

	if day==1 and month==1:
		return (31, 12, year-1)
							
def ndb_date_format(date):
	#ndb format is yyyy-mm-dd
	d,m,y = date		
	if d<10:
		d_s = '0'+str(d)	
	else: d_s = str(d)	
	if m<10:
		m_s = '0'+str(m)	
	else: m_s = str(m)	
	date_str = str(y)+"-"+m_s+"-"+d_s
	return date_str
	

def error_check_name(title):
	pass

	

# nickname shortener
# written on 23-Jun-2015
def ucase(name):
	if (len(name) < 1):
		return name
	else:	
		return name[0].upper() + name[1:]

def shorten_name(name):
	s = name.find(' ')
	if(s >= 0):
		name = name[0:s]
	l = len(name)
	a = name.find('@')

	if(l < 8):
		return ucase(name)

	if(a >= 0):
		name = name[0:a]	
		l = len(name)

	if(l < 8):
		return ucase(name)

	r = re.search('[0-9]', name)
	if(r and r.start() > 3):
		return ucase(name[0:r.start()])

	return ucase(name[0:7])			

		
			
