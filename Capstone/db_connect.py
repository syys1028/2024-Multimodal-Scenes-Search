import pymysql

# 데이터베이스에 연결하는 함수
def dbconnect():
    conn = pymysql.connect(host='my_ip', user='root', password='my_pw', db='movie_hackerton',port=13306 ,charset='utf8')
    return conn

# 데이터베이스에서 모든 데이터를 검색하는 함수
def search_all(conn):
    cur = conn.cursor()
    sql = "SELECT * FROM datatable_v3"
    cur.execute(sql)
    results = cur.fetchall()
    return results
